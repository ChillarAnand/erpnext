# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

from __future__ import unicode_literals
import frappe, json

from frappe.utils import getdate
from frappe import _


from frappe.model.document import Document

class Task(Document):
	def get_feed(self):
		return '{0}: {1}'.format(_(self.status), self.subject)

	def get_project_details(self):
		return {
			"project": self.project
		}

	def get_customer_details(self):
		cust = frappe.db.sql("select customer_name from `tabCustomer` where name=%s", self.customer)
		if cust:
			ret = {'customer_name': cust and cust[0][0] or ''}
			return ret

	def validate(self):
		self.validate_dates()
		
	def validate_dates(self):
		if self.exp_start_date and self.exp_end_date and getdate(self.exp_start_date) > getdate(self.exp_end_date):
			frappe.throw(_("'Expected Start Date' can not be greater than 'Expected End Date'"))

		if self.act_start_date and self.act_end_date and getdate(self.act_start_date) > getdate(self.act_end_date):
			frappe.throw(_("'Actual Start Date' can not be greater than 'Actual End Date'"))

	def on_update(self):
		self.update_percentage()
		self.update_project()
			
	def update_percentage(self):
		"""update percent complete in project"""
		if self.project and not self.flags.from_project:
			project = frappe.get_doc("Project", self.project)
			project.run_method("update_percent_complete")
			
	def update_project(self):
		total_activity_cost = frappe.db.sql("""select sum(actual_cost) from `tabTask` 
			where project = %s""",self.project)
		frappe.db.set_value("Project", self.project, "total_activity_cost", total_activity_cost)
		
		total_expense_claim = frappe.db.sql("""select sum(total_expense_claim) from `tabTask` 
			where project = %s""",self.project)
		frappe.db.set_value("Project", self.project, "total_expense_claim", total_expense_claim)

@frappe.whitelist()
def get_events(start, end, filters=None):
	from frappe.desk.reportview import build_match_conditions
	if not frappe.has_permission("Task"):
		frappe.msgprint(_("No Permission"), raise_exception=1)

	conditions = build_match_conditions("Task")
	conditions = conditions and (" and " + conditions) or ""

	if filters:
		filters = json.loads(filters)
		for key in filters:
			if filters[key]:
				conditions += " and " + key + ' = "' + filters[key].replace('"', '\"') + '"'

	data = frappe.db.sql("""select name, exp_start_date, exp_end_date,
		subject, status, project from `tabTask`
		where ((ifnull(exp_start_date, '0000-00-00')!= '0000-00-00') \
				and (exp_start_date between %(start)s and %(end)s) \
			or ((ifnull(exp_start_date, '0000-00-00')!= '0000-00-00') \
				and exp_end_date between %(start)s and %(end)s))
		{conditions}""".format(conditions=conditions), {
			"start": start,
			"end": end
		}, as_dict=True, update={"allDay": 0})

	return data

def get_project(doctype, txt, searchfield, start, page_len, filters):
	from erpnext.controllers.queries import get_match_cond
	return frappe.db.sql(""" select name from `tabProject`
			where %(key)s like "%(txt)s"
				%(mcond)s
			order by name
			limit %(start)s, %(page_len)s """ % {'key': searchfield,
			'txt': "%%%s%%" % txt, 'mcond':get_match_cond(doctype),
			'start': start, 'page_len': page_len})


@frappe.whitelist()
def set_multiple_status(names, status):
	names = json.loads(names)
	for name in names:
		task = frappe.get_doc("Task", name)
		task.status = status
		task.save()
