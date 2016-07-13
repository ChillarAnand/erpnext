# -*- coding: utf-8 -*-
# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt
from __future__ import unicode_literals

import frappe
import unittest
import datetime
from frappe.utils import now_datetime, nowdate
from erpnext.projects.doctype.timesheet.timesheet import OverlapError
from erpnext.projects.doctype.timesheet.timesheet import make_salary_slip, make_sales_invoice

class TestTimesheet(unittest.TestCase):
	def test_timesheet_billing_amount(self):
		salary_structure = make_salary_structure("_T-Employee-0001")
		timesheet = make_timesheet("_T-Employee-0001", True)

		self.assertEquals(timesheet.total_hours, 2)
		self.assertEquals(timesheet.time_logs[0].billing_rate, 50)
		self.assertEquals(timesheet.time_logs[0].billing_amount, 100)

	def test_salary_slip_from_timesheet(self):
		salary_structure = make_salary_structure("_T-Employee-0001")
		timesheet = make_timesheet("_T-Employee-0001", simulate = True)
		salary_slip = make_salary_slip(timesheet.name)
		salary_slip.submit()

		self.assertEquals(salary_slip.total_working_hours, 2)
		self.assertEquals(salary_slip.hour_rate, 50)
		self.assertEquals(salary_slip.net_pay, 150)
		self.assertEquals(salary_slip.timesheets[0].time_sheet, timesheet.name)
		self.assertEquals(salary_slip.timesheets[0].working_hours, 2)
		
		timesheet = frappe.get_doc('Timesheet', timesheet.name)
		self.assertEquals(timesheet.status, 'Payslip')
		salary_slip.cancel()

		timesheet = frappe.get_doc('Timesheet', timesheet.name)
		self.assertEquals(timesheet.status, 'Submitted')

	def test_sales_invoice_from_timesheet(self):
		timesheet = make_timesheet("_T-Employee-0001", simulate = True, billable = 1)
		sales_invoice = make_sales_invoice(timesheet.name)
		sales_invoice.customer = "_Test Customer"
		sales_invoice.due_date = nowdate()

		item = sales_invoice.append('items', {})
		item.item_code = '_Test Item'
		item.qty = 2
		item.rate = 100

		sales_invoice.submit()
		
		timesheet = frappe.get_doc('Timesheet', timesheet.name)
		self.assertEquals(sales_invoice.total_billing_amount, 100)
		self.assertEquals(timesheet.status, 'Billed')

def make_salary_structure(employee):
	name = frappe.db.get_value('Salary Structure', {'employee': employee, 'salary_slip_based_on_timesheet': 1}, 'name')
	if name:
		salary_structure = frappe.get_doc('Salary Structure', name)
	else:
		salary_structure = frappe.new_doc("Salary Structure")

	salary_structure.salary_slip_based_on_timesheet = 1
	salary_structure.employee = employee
	salary_structure.from_date = nowdate()
	salary_structure.salary_component = "Basic"
	salary_structure.hour_rate = 50.0
	salary_structure.company= "_Test Company"

	salary_structure.set('earnings', [])
	salary_structure.set('deductions', [])

	es = salary_structure.append('earnings', {
		"salary_component": "_Test Allowance",
		"amount": 100 
	})

	ds = salary_structure.append('deductions', {
		"salary_component": "_Test Professional Tax",
		"amount": 50
	})

	salary_structure.save(ignore_permissions=True)

	return salary_structure

def make_timesheet(employee, simulate=False, billable = 0, activity_type="_Test Activity Type", project=None, task=None):
	update_activity_type(activity_type)
	timesheet = frappe.new_doc("Timesheet")
	timesheet.employee = employee
	timesheet_detail = timesheet.append('time_logs', {})
	timesheet_detail.billable = billable
	timesheet_detail.activity_type = activity_type
	timesheet_detail.from_time = now_datetime()
	timesheet_detail.hours = 2
	timesheet_detail.to_time = timesheet_detail.from_time + datetime.timedelta(hours= timesheet_detail.hours)
	timesheet_detail.project = project
	timesheet_detail.task = task

	for data in timesheet.get('time_logs'):
		if simulate:
			while True:
				try:
					timesheet.save(ignore_permissions=True)
					break
				except OverlapError:
					data.from_time = data.from_time + datetime.timedelta(minutes=10)
					data.to_time = data.from_time + datetime.timedelta(hours= data.hours)
		else:
			timesheet.save(ignore_permissions=True)

	timesheet.submit()

	return timesheet

def update_activity_type(activity_type):
	activity_type = frappe.get_doc('Activity Type',activity_type)
	activity_type.billing_rate = 50.0
	activity_type.save(ignore_permissions=True)
