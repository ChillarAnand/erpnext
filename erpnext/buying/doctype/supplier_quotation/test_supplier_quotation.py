# Copyright (c) 2013, Web Notes Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt


from __future__ import unicode_literals
import unittest
import frappe
import frappe.defaults

class TestPurchaseOrder(unittest.TestCase):
	def test_make_purchase_order(self):
		from erpnext.buying.doctype.supplier_quotation.supplier_quotation import make_purchase_order

		sq = frappe.copy_doc(test_records[0]).insert()

		self.assertRaises(frappe.ValidationError, make_purchase_order, 
			sq.name)

		sq = frappe.get_doc("Supplier Quotation", sq.name)
		sq.submit()
		po = make_purchase_order(sq.name)
		
		self.assertEquals(po[0]["doctype"], "Purchase Order")
		self.assertEquals(len(po), len(sq))
		
		po[0]["naming_series"] = "_T-Purchase Order-"

		for doc in po:
			if doc.get("item_code"):
				doc["schedule_date"] = "2013-04-12"

		frappe.get_doc(po).insert()
		
test_records = frappe.get_test_records('Supplier Quotation')