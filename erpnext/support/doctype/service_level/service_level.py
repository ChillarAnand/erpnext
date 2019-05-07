# -*- coding: utf-8 -*-
# Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.model.document import Document
from datetime import datetime
from frappe.utils import get_weekdays

class ServiceLevel(Document):

	def validate(self):
		self.check_priorities()
		self.check_support_and_resolution()

	def check_priorities(self):
		priorities = []

		for priority in self.priorities:
			# Check if response and resolution time is set for every priority
			if not (priority.response_time or priority.resolution_time):
				frappe.throw(_("Set Response Time and Resolution for Priority {0} at index {1}.".format(priority.priority, priority.idx)))

			priorities.append(priority.priority)

			if priority.response_time_period == "Hour":
				response = priority.response_time * 0.0416667
			elif priority.response_time_period == "Day":
				response = priority.response_time
			elif priority.response_time_period == "Week":
				response = priority.response_time * 7

			if priority.resolution_time_period == "Hour":
				resolution = priority.resolution_time * 0.0416667
			elif priority.resolution_time_period == "Day":
				resolution = priority.resolution_time
			elif priority.resolution_time_period == "Week":
				resolution = priority.resolution_time * 7

			if response > resolution:
				frappe.throw(_("Response Time for {0} at index {1} can't be greater than Resolution Time.".format(priority.priority, priority.idx)))

		# Check if repeated priority
		if not len(set(priorities)) == len(priorities):
			repeated_priority = get_repeated(priorities)
			frappe.throw(_("Priority {0} has been repeated.".format(repeated_priority)))

		# Check if values for all the priority options is set
		priority_count = ([field.options for field in frappe.get_meta("Service Level Priority").fields if field.fieldname=='priority'][0]).split("\n")
		if not len(set(priorities)) == len(priority_count):
			frappe.throw(_("Set values for all the Priorities {0}.".format(" ".join(priority_count))))

	def check_support_and_resolution(self):
		week = get_weekdays()
		support_days = []

		for support_and_resolution in self.support_and_resolution:
			# Check if start and end time is set for every support day
			if not (support_and_resolution.start_time or support_and_resolution.end_time):
				frappe.throw(_("Set Start Time and End Time for  \
					Support Day {0} at index {1}.".format(support_and_resolution.workday, support_and_resolution.idx)))

			support_days.append(support_and_resolution.workday)
			support_and_resolution.idx = week.index(support_and_resolution.workday) + 1

			if support_and_resolution.start_time >= support_and_resolution.end_time:
				frappe.throw(_("Start Time can't be greater than or equal to End Time \
					for {0}.".format(support_and_resolution.workday)))

		# Check for repeated workday
		if not len(set(support_days)) == len(support_days):
			repeated_days = get_repeated(support_days)
			frappe.throw(_("Workday {0} has been repeated.".format(repeated_days)))

	def get_service_level_priority(self, priority):
		priority = frappe.get_doc("Service Level Priority", {"priority": priority, "parent": self.name})

		return frappe._dict({
					"priority": priority.priority,
					"response_time": priority.response_time,
					"response_time_period": priority.response_time_period,
					"resolution_time": priority.resolution_time,
					"resolution_time_period": priority.resolution_time_period
				})

def get_repeated(values):
	unique_list = []
	diff = []
	for value in values:
		if value not in unique_list:
			unique_list.append(value)
		else:
			if value not in diff:
				diff.append(value)
	return " ".join(diff)
