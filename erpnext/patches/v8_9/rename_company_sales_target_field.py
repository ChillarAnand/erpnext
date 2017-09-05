from __future__ import unicode_literals
import frappe
from frappe.model.utils.rename_field import rename_field

def execute():
	frappe.reload_doc("setup", "doctype", "company")
	rename_field("Company", "sales_target", "monthly_sales_target")
