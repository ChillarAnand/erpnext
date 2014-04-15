# Copyright (c) 2013, Web Notes Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

from __future__ import unicode_literals
import frappe

from frappe.utils import flt, now
from frappe.model.document import Document

class StockLedger(Document):

	def update_stock(self, values, is_amended = 'No'):
		for v in values:
			sle_id = ''

			# reverse quantities for cancel
			if v.get('is_cancelled') == 'Yes':
				v['actual_qty'] = -flt(v['actual_qty'])
				# cancel matching entry
				frappe.db.sql("""update `tabStock Ledger Entry` set is_cancelled='Yes',
					modified=%s, modified_by=%s
					where voucher_no=%s and voucher_type=%s""",
					(now(), frappe.session.user, v['voucher_no'], v['voucher_type']))

			if v.get("actual_qty"):
				sle_id = self.make_entry(v)

			args = v.copy()
			args.update({
				"sle_id": sle_id,
				"is_amended": is_amended
			})

			frappe.get_doc('Warehouse', v["warehouse"]).update_bin(args)


	def make_entry(self, args):
		args.update({"doctype": "Stock Ledger Entry"})
		sle = frappe.get_doc(args)
		sle.ignore_permissions = 1
		sle.insert()
		return sle.name

	def repost(self):
		"""
		Repost everything!
		"""
		for wh in frappe.db.sql("select name from tabWarehouse"):
			frappe.get_doc('Warehouse', wh[0]).repost_stock()
