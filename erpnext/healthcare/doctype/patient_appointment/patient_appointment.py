# -*- coding: utf-8 -*-
# Copyright (c) 2015, ESS LLP and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
import json
from frappe.utils import getdate
from frappe import _
import datetime
from frappe.core.doctype.sms_settings.sms_settings import send_sms
from erpnext.hr.doctype.employee.employee import is_holiday

class PatientAppointment(Document):
	def on_update(self):
		today = datetime.date.today()
		appointment_date = getdate(self.appointment_date)

		# If appointment created for today set as open
		if today == appointment_date:
			frappe.db.set_value("Patient Appointment", self.name, "status", "Open")
			self.reload()

	def after_insert(self):
		if self.procedure_prescription:
			frappe.db.set_value("Procedure Prescription", self.procedure_prescription, "appointment_booked", True)
		# Check fee validity exists
		appointment = self
		validity_exist = validity_exists(appointment.practitioner, appointment.patient)
		if validity_exist:
			fee_validity = frappe.get_doc("Fee Validity", validity_exist[0][0])

			# Check if the validity is valid
			appointment_date = getdate(appointment.appointment_date)
			if (fee_validity.valid_till >= appointment_date) and (fee_validity.visited < fee_validity.max_visit):
				visited = fee_validity.visited + 1
				frappe.db.set_value("Fee Validity", fee_validity.name, "visited", visited)
				if fee_validity.ref_invoice:
					frappe.db.set_value("Patient Appointment", appointment.name, "invoiced", True)
				frappe.msgprint(_("{0} has fee validity till {1}").format(appointment.patient, fee_validity.valid_till))
		confirm_sms(self)

def appointment_cancel(appointment_id):
	appointment = frappe.get_doc("Patient Appointment", appointment_id)

	# If invoiced --> fee_validity update with -1 visit
	if appointment.invoiced:
		validity = validity_exists(appointment.practitioner, appointment.patient)
		if validity:
			fee_validity = frappe.get_doc("Fee Validity", validity[0][0])
			visited = fee_validity.visited - 1
			frappe.db.set_value("Fee Validity", fee_validity.name, "visited", visited)
			if visited <= 0:
				frappe.msgprint(
					_("Appointment cancelled, Please review and cancel the invoice {0}".format(fee_validity.ref_invoice))
				)
			else:
				frappe.msgprint(_("Appointment cancelled"))


@frappe.whitelist()
def get_availability_data(date, practitioner):
	"""
	Get availability data of 'practitioner' on 'date'
	:param date: Date to check in schedule
	:param practitioner: Name of the practitioner
	:return: dict containing a list of available slots, list of appointments and time of appointments
	"""

	date = getdate(date)
	weekday = date.strftime("%A")

	available_slots = []
	slot_details = []
	practitioner_schedule = None

	employee = None

	practitioner_obj = frappe.get_doc("Healthcare Practitioner", practitioner)

	# Get practitioner employee relation
	if practitioner_obj.employee:
		employee = practitioner_obj.employee
	elif practitioner_obj.user_id:
		if frappe.db.exists({
			"doctype": "Employee",
			"user_id": practitioner_obj.user_id
			}):
			employee = frappe.get_doc("Employee", {"user_id": practitioner_obj.user_id}).name

	if employee:
		# Check if it is Holiday
		if is_holiday(employee, date):
			frappe.throw(_("{0} is a company holiday".format(date)))

		# Check if He/She on Leave
		leave_record = frappe.db.sql("""select half_day from `tabLeave Application`
			where employee = %s and %s between from_date and to_date
			and docstatus = 1""", (employee, date), as_dict=True)
		if leave_record:
			if leave_record[0].half_day:
				frappe.throw(_("{0} on Half day Leave on {1}").format(practitioner, date))
			else:
				frappe.throw(_("{0} on Leave on {1}").format(practitioner, date))

	# get practitioners schedule
	if practitioner_obj.practitioner_schedules:
		for schedule in practitioner_obj.practitioner_schedules:
			if schedule.schedule:
				practitioner_schedule = frappe.get_doc("Practitioner Schedule", schedule.schedule)
			else:
				frappe.throw(_("{0} does not have a Healthcare Practitioner Schedule. Add it in Healthcare Practitioner master".format(practitioner)))

			if practitioner_schedule:
				available_slots = []
				for t in practitioner_schedule.time_slots:
					if weekday == t.day:
						available_slots.append(t)

				if available_slots:
					appointments = []

					if schedule.service_unit:
						slot_name  = schedule.schedule+" - "+schedule.service_unit
						allow_overlap = frappe.get_value('Healthcare Service Unit', schedule.service_unit, 'overlap_appointments')
						if allow_overlap:
							# fetch all appointments to practitioner by service unit
							appointments = frappe.get_all(
								"Patient Appointment",
								filters={"practitioner": practitioner, "service_unit": schedule.service_unit, "appointment_date": date, "status": ["not in",["Cancelled"]]},
								fields=["name", "appointment_time", "duration", "status"])
						else:
							# fetch all appointments to service unit
							appointments = frappe.get_all(
								"Patient Appointment",
								filters={"service_unit": schedule.service_unit, "appointment_date": date, "status": ["not in",["Cancelled"]]},
								fields=["name", "appointment_time", "duration", "status"])
					else:
						slot_name = schedule.schedule
						# fetch all appointments to practitioner without service unit
						appointments = frappe.get_all(
							"Patient Appointment",
							filters={"practitioner": practitioner, "service_unit": '', "appointment_date": date, "status": ["not in",["Cancelled"]]},
							fields=["name", "appointment_time", "duration", "status"])

					slot_details.append({"slot_name":slot_name, "service_unit":schedule.service_unit,
						"avail_slot":available_slots, 'appointments': appointments})

	else:
		frappe.throw(_("{0} does not have a Healthcare Practitioner Schedule. Add it in Healthcare Practitioner master".format(practitioner)))

	if not available_slots and not slot_details:
		# TODO: return available slots in nearby dates
		frappe.throw(_("Healthcare Practitioner not available on {0}").format(weekday))

	return {
		"slot_details": slot_details
	}


@frappe.whitelist()
def update_status(appointment_id, status):
	frappe.db.set_value("Patient Appointment", appointment_id, "status", status)
	appointment_booked = True
	if status == "Cancelled":
		appointment_booked = False
		appointment_cancel(appointment_id)

	procedure_prescription = frappe.db.get_value("Patient Appointment", appointment_id, "procedure_prescription")
	if procedure_prescription:
		frappe.db.set_value("Procedure Prescription", procedure_prescription, "appointment_booked", appointment_booked)


@frappe.whitelist()
def set_open_appointments():
	today = getdate()
	frappe.db.sql(
		"update `tabPatient Appointment` set status='Open' where status = 'Scheduled'"
		" and appointment_date = %s", today)


@frappe.whitelist()
def set_pending_appointments():
	today = getdate()
	frappe.db.sql(
		"update `tabPatient Appointment` set status='Pending' where status in "
		"('Scheduled','Open') and appointment_date < %s", today)


def confirm_sms(doc):
	if frappe.db.get_value("Healthcare Settings", None, "app_con") == '1':
		message = frappe.db.get_value("Healthcare Settings", None, "app_con_msg")
		send_message(doc, message)


def validity_exists(practitioner, patient):
	return frappe.db.exists({
			"doctype": "Fee Validity",
			"practitioner": practitioner,
			"patient": patient})

@frappe.whitelist()
def create_encounter(appointment):
	appointment = frappe.get_doc("Patient Appointment", appointment)
	encounter = frappe.new_doc("Patient Encounter")
	encounter.appointment = appointment.name
	encounter.patient = appointment.patient
	encounter.practitioner = appointment.practitioner
	encounter.visit_department = appointment.department
	encounter.patient_sex = appointment.patient_sex
	encounter.encounter_date = appointment.appointment_date
	if appointment.invoiced:
		encounter.invoiced = True
	return encounter.as_dict()


def remind_appointment():
	if frappe.db.get_value("Healthcare Settings", None, "app_rem") == '1':
		rem_before = datetime.datetime.strptime(frappe.get_value("Healthcare Settings", None, "rem_before"), "%H:%M:%S")
		rem_dt = datetime.datetime.now() + datetime.timedelta(
			hours=rem_before.hour, minutes=rem_before.minute, seconds=rem_before.second)

		appointment_list = frappe.db.sql(
			"select name from `tabPatient Appointment` where start_dt between %s and %s and reminded = 0 ",
			(datetime.datetime.now(), rem_dt)
		)

		for i in range(0, len(appointment_list)):
			doc = frappe.get_doc("Patient Appointment", appointment_list[i][0])
			message = frappe.db.get_value("Healthcare Settings", None, "app_rem_msg")
			send_message(doc, message)
			frappe.db.set_value("Patient Appointment", doc.name, "reminded",1)


def send_message(doc, message):
	patient = frappe.get_doc("Patient", doc.patient)
	if patient.mobile:
		context = {"doc": doc, "alert": doc, "comments": None}
		if doc.get("_comments"):
			context["comments"] = json.loads(doc.get("_comments"))

		# jinja to string convertion happens here
		message = frappe.render_template(message, context)
		number = [patient.mobile]
		send_sms(number, message)


@frappe.whitelist()
def get_events(start, end, filters=None):
	"""Returns events for Gantt / Calendar view rendering.

	:param start: Start date-time.
	:param end: End date-time.
	:param filters: Filters (JSON).
	"""
	from frappe.desk.calendar import get_event_conditions
	conditions = get_event_conditions("Patient Appointment", filters)

	data = frappe.db.sql("""select name, patient, physician, status,
		duration, timestamp(appointment_date, appointment_time) as
		'appointment_date' from `tabPatient Appointment` where
		(appointment_date between %(start)s and %(end)s)
		and docstatus < 2 {conditions}""".format(conditions=conditions),
		{"start": start, "end": end}, as_dict=True, update={"allDay": 0})

	for item in data:
		item.appointment_datetime = item.appointment_date + datetime.timedelta(minutes = item.duration)

	return data

@frappe.whitelist()
def get_procedure_prescribed(patient):
	return frappe.db.sql("""select pp.name, pp.procedure, pp.parent, ct.practitioner,
	ct.encounter_date, pp.practitioner, pp.date, pp.department
	from `tabPatient Encounter` ct, `tabProcedure Prescription` pp
	where ct.patient='{0}' and pp.parent=ct.name and pp.appointment_booked=0
	order by ct.creation desc""".format(patient))
