from __future__ import unicode_literals
import frappe

def execute():
	stock_settings = frappe.get_doc('Stock Settings')
	stock_settings.save()