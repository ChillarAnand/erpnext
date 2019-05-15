from __future__ import unicode_literals
import frappe
import unittest
from frappe.utils import nowdate, add_months, getdate, add_days
from erpnext.hr.doctype.leave_type.test_leave_type import create_leave_type

class TestLeaveAllocation(unittest.TestCase):
	def test_overlapping_allocation(self):
		frappe.db.sql("delete from `tabLeave Allocation`")

		employee = frappe.get_doc("Employee", frappe.db.sql_list("select name from tabEmployee limit 1")[0])
		leaves = [
			{
				"doctype": "Leave Allocation",
				"__islocal": 1,
				"employee": employee.name,
				"employee_name": employee.employee_name,
				"leave_type": "_Test Leave Type",
				"from_date": getdate("2015-10-01"),
				"to_date": getdate("2015-10-31"),
				"new_leaves_allocated": 5,
				"docstatus": 1
			},
			{
				"doctype": "Leave Allocation",
				"__islocal": 1,
				"employee": employee.name,
				"employee_name": employee.employee_name,
				"leave_type": "_Test Leave Type",
				"from_date": getdate("2015-09-01"),
				"to_date": getdate("2015-11-30"),
				"new_leaves_allocated": 5
			}
		]

		frappe.get_doc(leaves[0]).save()
		self.assertRaises(frappe.ValidationError, frappe.get_doc(leaves[1]).save)

	def test_invalid_period(self):
		employee = frappe.get_doc("Employee", frappe.db.sql_list("select name from tabEmployee limit 1")[0])

		doc = frappe.get_doc({
			"doctype": "Leave Allocation",
			"__islocal": 1,
			"employee": employee.name,
			"employee_name": employee.employee_name,
			"leave_type": "_Test Leave Type",
			"from_date": getdate("2015-09-30"),
			"to_date": getdate("2015-09-1"),
			"new_leaves_allocated": 5
		})

		#invalid period
		self.assertRaises(frappe.ValidationError, doc.save)

	def test_allocated_leave_days_over_period(self):
		employee = frappe.get_doc("Employee", frappe.db.sql_list("select name from tabEmployee limit 1")[0])
		doc = frappe.get_doc({
			"doctype": "Leave Allocation",
			"__islocal": 1,
			"employee": employee.name,
			"employee_name": employee.employee_name,
			"leave_type": "_Test Leave Type",
			"from_date": getdate("2015-09-1"),
			"to_date": getdate("2015-09-30"),
			"new_leaves_allocated": 35
		})
		#allocated leave more than period
		self.assertRaises(frappe.ValidationError, doc.save)

	def test_carry_forward_allocation(self):
		frappe.db.sql("delete from `tabLeave Allocation`")

		leave_type = create_leave_type(
			leave_type_name="_Test Carry Forward",
			is_carry_forward=1,
			carry_forward_leave_expiry=366)
		leave_type.submit()

		leave_allocation = create_leave_allocation(
			from_date=add_months(nowdate(), -12),
			to_date=add_days(nowdate(), -1),
			leave_type=leave_type
		)
		leave_allocation.new_leaves_allocated = 10
		leave_allocation.submit()

		carry_forward_alloc = create_leave_allocation(leave_type=leave_type)
		carry_forward_alloc.carry_forward = 1
		carry_forward_alloc.save()
		self.assertEquals(carry_forward_alloc.total_leaves_allocated, 10)

def create_leave_allocation(**args):
	args = frappe._dict(args)

	employee = frappe.get_doc("Employee", frappe.db.sql_list("select name from tabEmployee limit 1")[0])
	leave_allocation = frappe.get_doc({
		"doctype": "Leave Allocation",
		"__islocal": 1,
		"employee": employee.name,
		"employee_name": employee.employee_name,
		"leave_type": args.leave_type.leave_type_name or "_Test Leave Type",
		"from_date": args.from_date or nowdate(),
		"to_date": args.to_date or add_months(nowdate(), 12)
	})
	return leave_allocation

test_dependencies = ["Employee", "Leave Type"]