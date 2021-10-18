import frappe


def execute():
	doctypes = frappe.get_all("DocType", {"module": "healthcare"})
	for doctype in doctypes:
		frappe.delete_doc("DocType", doctype, ignore_missing=True)
