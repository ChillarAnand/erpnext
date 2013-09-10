# Copyright (c) 2013, Web Notes Technologies Pvt. Ltd.
# License: GNU General Public License v3. See license.txt

from __future__ import unicode_literals
import webnotes

def get_context():
	from portal.website_transactions import get_currency_context
	context = get_currency_context()
	context.update({
		"title": "Shipments",
		"method": "portal.templates.pages.shipments.get_shipments",
		"icon": "icon-truck",
		"empty_list_message": "No Shipments Found",
		"page": "shipment"
	})
	return context
	
@webnotes.whitelist()
def get_shipments(start=0):
	from portal.website_transactions import get_transaction_list
	return get_transaction_list("Delivery Note", start)
