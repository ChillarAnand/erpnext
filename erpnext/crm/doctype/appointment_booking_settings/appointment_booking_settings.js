frappe.ui.form.on('Appointment Booking Settings', 'validate',check_times);
function check_times(frm) {
	$.each(frm.doc.availability_of_slots || [], function (i, d) {
		let from_time = Date.parse('01/01/2019 ' + d.from_time);
		let to_time = Date.parse('01/01/2019 ' + d.to_time);
		if (from_time > to_time) {
			frappe.throw(__(`In row ${i + 1} of Availability Of Slots : "To Time" must be later than "From Time"`));
		}
	});
}