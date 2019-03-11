# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt


from __future__ import unicode_literals
import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    company = frappe.get_cached_value("Company", {'country': 'India'}, 'name')
    if not company:
        return

    custom_fields = {
        'Stock Entry Detail': [dict(fieldname='gst_hsn_code', label='HSN/SAC',
            fieldtype='Data', fetch_from='item_code.gst_hsn_code',
            insert_after='description', allow_on_submit=1, print_hide=0)]
    }

    create_custom_fields(custom_fields, ignore_validate = frappe.flags.in_patch, update=True)

    frappe.db.sql(""" update `tabStock Entry Detail`, `tabItem`
        SET
            `tabStock Entry Detail`.gst_hsn_code = `tabItem`.gst_hsn_code
        Where
            `tabItem`.name = `tabStock Entry Detail`.item_code and `tabItem`.gst_hsn_code is not null
    """)