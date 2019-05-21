# -*- coding: utf-8 -*-
# Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe import _

class ServiceLevelAgreement(Document):

	def validate(self):
		if self.default_service_level_agreement:
			if frappe.db.exists("Service Level Agreement", {"default_service_level_agreement": "1", "name": ["!=", self.name]}):
				frappe.throw(_("A Default Service Level Agreement already exists."))
		else:
			if not self.ignore_start_and_end_date and not (self.start_date and self.end_date):
				frappe.throw(_("Enter Start and End Date for the Agreement."))

			if not self.ignore_start_and_end_date and self.start_date >= self.end_date:
				frappe.throw(_("Start Date of Agreement can't be greater than or equal to End Date."))

			if not self.ignore_start_and_end_date and self.end_date < frappe.utils.getdate():
				frappe.throw(_("End Date of Agreement can't be less than today."))

	def get_service_level_agreement_priority(self, priority):
		priority = frappe.get_doc("Service Level Priority", {"priority": priority, "parent": self.name})

		return frappe._dict({
			"priority": priority.priority,
			"response_time": priority.response_time,
			"response_time_period": priority.response_time_period,
			"resolution_time": priority.resolution_time,
			"resolution_time_period": priority.resolution_time_period
		})

def check_agreement_status():
	service_level_agreements = frappe.get_list("Service Level Agreement", filters=[
		{"agreement_status": "Active"},
		{"default_service_level_agreement": 0}
	], fields=["name", "end_date"])

	for service_level_agreement in service_level_agreements:
		if service_level_agreement.end_date < frappe.utils.getdate():
			frappe.db.set_value("Service Level Agreement", service_level_agreement.name,
				"agreement_status", "Expired")

def get_active_service_level_agreement_for(priority, customer=None, service_level_agreement=None):
	filters = [
		["Service Level Agreement", "agreement_status", "=", "Active"]
	]

	if priority:
		filters.append(["Service Level Priority", "priority", "=", priority])

	or_filters = [
		["Service Level Agreement", "customer", "=", customer],
	]
	if service_level_agreement:
		or_filters = [
			["Service Level Agreement", "name", "=", service_level_agreement],
		]

	or_filters.append(["Service Level Agreement", "default_service_level_agreement", "=", 1])

	agreement = frappe.get_list("Service Level Agreement", filters=filters, or_filters=or_filters,
		fields=["name", "default_priority", "customer"], debug=True)

	return agreement[0] if agreement else None