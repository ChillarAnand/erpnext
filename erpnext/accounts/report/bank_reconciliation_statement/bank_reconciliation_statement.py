# Copyright (c) 2013, Web Notes Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

from __future__ import unicode_literals
import frappe
from frappe.utils import flt

def execute(filters=None):
	if not filters: filters = {}

	columns = get_columns()

	if not filters.get("account"): return columns, []

	data = get_entries(filters)

	from erpnext.accounts.utils import get_balance_on
	balance_as_per_company = get_balance_on(filters["account"], filters["report_date"])

	total_debit, total_credit = 0,0
	for d in data:
		total_debit += flt(d[2])
		total_credit += flt(d[3])

	bank_bal = flt(balance_as_per_company) - flt(total_debit) + flt(total_credit)

	data += [
		get_balance_row("Balance as per company books", balance_as_per_company),
		["", "Amounts not reflected in bank", total_debit, total_credit, "", "", "", ""],
		get_balance_row("Balance as per bank", bank_bal)
	]

	return columns, data

def get_columns():
	return ["Posting Date:Date:100", "Journal Voucher:Link/Journal Voucher:200",
		"Debit:Currency:120", "Credit:Currency:120",
		"Against Account:Link/Account:200", "Reference::100", "Ref Date:Date:110", "Clearance Date:Date:110"
	]

def get_entries(filters):
	entries = frappe.db.sql("""select
			jv.posting_date, jv.name, jvd.debit, jvd.credit,
			jvd.against_account, jv.cheque_no, jv.cheque_date, jv.clearance_date
		from
			`tabJournal Voucher Detail` jvd, `tabJournal Voucher` jv
		where jvd.parent = jv.name and jv.docstatus=1
			and jvd.account = %(account)s and jv.posting_date <= %(report_date)s
			and ifnull(jv.clearance_date, '4000-01-01') > %(report_date)s
		order by jv.name DESC""", filters, as_list=1)

	return entries

def get_balance_row(label, amount):
	if amount > 0:
		return ["", label, amount, 0, "", "", "", ""]
	else:
		return ["", label, 0, amount, "", "", "", ""]
