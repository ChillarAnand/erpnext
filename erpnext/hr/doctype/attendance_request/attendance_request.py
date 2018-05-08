# -*- coding: utf-8 -*-
# Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.utils import date_diff, add_days
from erpnext.hr.doctype.employee.employee import is_holiday
from erpnext.hr.utils import validate_dates

class AttendanceRequest(Document):
	def validate(self):
		validate_dates(self, self.from_date, self.to_date)

	def on_submit(self):
		self.create_attendance()

	def on_cancel(self):
		attendance_list = frappe.get_list("Attendance", {'employee': self.employee, 'attendance_request': self.name})
		if attendance_list:
			for attendance in attendance_list:
				attendance_obj = frappe.get_doc("Attendance", attendance['name'])
				attendance_obj.cancel()

	def create_attendance(self):
		request_days = date_diff(self.to_date, self.from_date) + 1
		for number in range(request_days):
			attendance_date = add_days(self.from_date, number)
			skip_attendance = self.validate_if_attendance_not_applicable(attendance_date)
			if not skip_attendance:
				attendance = frappe.new_doc("Attendance")
				attendance.employee = self.employee
				attendance.employee_name = self.employee_name
				attendance.status = "Present"
				attendance.attendance_date = attendance_date
				attendance.company = self.company
				attendance.attendance_request = self.name
				attendance.save(ignore_permissions=True)
				attendance.submit()

	def validate_if_attendance_not_applicable(self, attendance_date):
		# Check if attendance_date is a Holiday
		if is_holiday(self.employee, attendance_date):
			return True

		# Check if employee on Leave
		leave_record = frappe.db.sql("""select half_day from `tabLeave Application`
			where employee = %s and %s between from_date and to_date
			and docstatus = 1""", (self.employee, attendance_date), as_dict=True)
		if leave_record:
			return True

		return False
