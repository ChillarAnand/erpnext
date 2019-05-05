# Copyright (c) 2017, Frappe and Contributors
# License: GNU General Public License v3. See license.txt

from __future__ import unicode_literals
import frappe

def execute():
	priorities = ["Low", "Medium", "High"]

	service_levels = frappe.get_list("Service Level")
	for service_level in service_levels:
		doc = frappe.get_doc("Service Level", service_level)
		doc.update({
			"priorities": [
				{
					"priority": "Low",
					"response_time": doc.response_time,
					"response_time_period": doc.response_time_period,
					"resolution_time": doc.resolution_time,
					"resolution_time_period": doc.resolution_time_period,
				},
				{
					"priority": "Medium",
					"response_time": doc.response_time,
					"response_time_period": doc.response_time_period,
					"resolution_time": doc.resolution_time,
					"resolution_time_period": doc.resolution_time_period,
				},
				{
					"priority": "High",
					"response_time": doc.response_time,
					"response_time_period": doc.response_time_period,
					"resolution_time": doc.resolution_time,
					"resolution_time_period": doc.resolution_time_period,
				}
			]
		})

	service_level_agreements = frappe.get_list("Service Level Agreement")
	for service_level_agreement in service_level_agreements:
		doc = frappe.get_doc("Service Level Agreement", service_level_agreement)
		doc.update({
			"priorities": [
				{
					"priority": "Low",
					"response_time": doc.response_time,
					"response_time_period": doc.response_time_period,
					"resolution_time": doc.resolution_time,
					"resolution_time_period": doc.resolution_time_period,
				},
				{
					"priority": "Medium",
					"response_time": doc.response_time,
					"response_time_period": doc.response_time_period,
					"resolution_time": doc.resolution_time,
					"resolution_time_period": doc.resolution_time_period,
				},
				{
					"priority": "High",
					"response_time": doc.response_time,
					"response_time_period": doc.response_time_period,
					"resolution_time": doc.resolution_time,
					"resolution_time_period": doc.resolution_time_period,
				},
			]
		})
