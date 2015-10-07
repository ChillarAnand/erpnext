import frappe

def execute():
	frappe.reload_doctype("File")
	frappe.reload_doctype("Item")
	for item in frappe.get_all("Item", fields=("name", "website_image")):
		if item.website_image:
			item_doc = frappe.get_doc("Item", item.name)
			try:
				item_doc.make_thumbnail()
				if item_doc.thumbnail:
					item_doc.db_set("thumbnail", item_doc.thumbnail)
			except Exception:
				print "Unable to make thumbnail for {0}".format(item.website_image)
