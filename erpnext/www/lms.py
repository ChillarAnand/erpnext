from __future__ import unicode_literals
import erpnext.education.utils as utils
import frappe

# LMS Utils to Update State for Vue Store
@frappe.whitelist()
def get_program_enrollments():
	student = utils.get_current_student()
	if student == None:
		return None
	try:
		student = frappe.get_doc("Student", student)
		return student.get_program_enrollments()
	except:
		return None

@frappe.whitelist()
def get_all_course_enrollments():
	student = utils.get_current_student()
	if student == None:
		return None
	try:
		student = frappe.get_doc("Student", student)
		return student.get_all_course_enrollments()
	except:
		return None

# Vue Client Functions
@frappe.whitelist(allow_guest=True)
def get_portal_details():
	"""
	Returns portal details from Education Settings Doctype. This contains the Title and Description for LMS amoung other things.
	"""
	from erpnext import get_default_company

	settings = frappe.get_doc("Education Settings")
	title = settings.portal_title or get_default_company()
	description = settings.description
	return dict(title=title, description=description)

@frappe.whitelist(allow_guest=True)
def get_featured_programs():
	featured_program_names = frappe.get_all("Program", filters={"is_published": True, "is_featured": True})
	if featured_program_names:
		featured_list = [utils.get_program(program['name']) for program in featured_program_names]
		return featured_list
	else:
		return get_all_programs()[:2]

@frappe.whitelist(allow_guest=True)
def get_all_programs():
	program_names = frappe.get_all("Program", filters={"is_published": True})
	if program_names:
		program_list = [utils.get_program(program['name']) for program in program_names]
		return program_list
	else:
		return None

@frappe.whitelist(allow_guest=True)
def get_program_details(program_name):
	try:
		program = frappe.get_doc('Program', program_name)
		return program
	except:
		return None

# Functions to get program & course details
@frappe.whitelist(allow_guest=True)
def get_courses(program_name):
	program = frappe.get_doc('Program', program_name)
	courses = program.get_course_list()
	return courses

@frappe.whitelist()
def get_next_content(current_content, current_content_type, topic):
	if frappe.session.user == "Guest":
		return None
	topic = frappe.get_doc("Topic", topic)
	content_list = [{'content_type':item.doctype, 'content':item.name} for item in topic.get_contents()]
	current_index = content_list.index({'content': current_content, 'content_type': current_content_type})
	try:
		return content_list[current_index + 1]
	except IndexError:
		return None

def get_quiz_with_answers(quiz_name):
	try:
		quiz = frappe.get_doc("Quiz", quiz_name).get_questions()
		quiz_output = [{'name':question.name, 'question':question.question, 'options':[{'name': option.name, 'option':option.option, 'is_correct':option.is_correct} for option in question.options]} for question in quiz]
		return quiz_output
	except:
		frappe.throw("Quiz {0} does not exist".format(quiz_name))
		return None

@frappe.whitelist()
def get_quiz_without_answers(quiz_name):
	try:
		quiz = frappe.get_doc("Quiz", quiz_name).get_questions()
		quiz_output = [{'name':question.name, 'question':question.question, 'options':[{'name': option.name, 'option':option.option} for option in question.options]} for question in quiz]
		return quiz_output
	except:
		frappe.throw("Quiz {0} does not exist".format(quiz_name))
		return None

@frappe.whitelist()
def evaluate_quiz(course, quiz_response, quiz_name):
	"""LMS Function: Evaluates a simple multiple choice quiz.
	:param quiz_response: contains user selected choices for a quiz in the form of a string formatted as a dictionary. The function uses `json.loads()` to convert it to a python dictionary.
	"""
	import json
	quiz_response = json.loads(quiz_response)
	quiz = frappe.get_doc("Quiz", quiz_name)
	enrollment = utils.get_course_enrollment(course).name
	answers, score, status = quiz.evaluate(quiz_response, quiz_name)

	result = {k: ('Correct' if v else 'Wrong') for k,v in answers.items()}
	result_data = []
	for key in answers:
		item = {}
		item['question'] = key
		item['quiz_result'] = result[key]
		try:
			item['selected_option'] = frappe.get_value('Options', quiz_response[key], 'option')
		except:
			item['selected_option'] = "Unattempted"
		result_data.append(item)
	# result_data = [{'question': key, 'selected_option': frappe.get_value('Options', quiz_response[key], 'option'), 'quiz_result': result[key]} for key in answers]

	add_quiz_activity(enrollment, quiz_name, result_data, score, status)
	return(score)

def add_quiz_activity(enrollment, quiz_name, result_data, score, status):
	quiz_activity = frappe.get_doc({
		"doctype": "Quiz Activity",
		"enrollment": enrollment,
		"quiz": quiz_name,
		"activity_date": frappe.utils.datetime.datetime.now(),
		"result": result_data,
		"score": score,
		"status": status
		})
	quiz_activity.save()
	frappe.db.commit()

@frappe.whitelist()
def enroll_in_program(program_name):
	if(not utils.get_current_student()):
		utils.create_student_from_current_user()
	student = frappe.get_doc("Student", utils.get_current_student())
	program_enrollment = student.enroll_in_program(program_name)
	return program_name

# Academty Activity
@frappe.whitelist()
def add_activity(course, content_type, content):
	enrollment = utils.get_course_enrollment(course)
	if(utils.check_activity_exists(enrollment.name, content_type, content)):
		pass
	else:
		activity = frappe.get_doc({
			"doctype": "Course Activity",
			"enrollment": enrollment.name,
			"content_type": content_type,
			"content": content,
			"activity_date": frappe.utils.datetime.datetime.now()
			})
		activity.save()
		frappe.db.commit()

@frappe.whitelist()
def get_course_meta(course_name, program_name):
	"""
	Return the porgress of a course in a program as well as the content to continue from.
		:param course_name:
		:param program_name:
	"""
	course_enrollment = utils.get_course_enrollment(course_name)
	program_enrollment = utils.get_program_enrollment(program_name)
	student = frappe.get_doc("Student", utils.get_current_student())
	if not program_enrollment:
		return None
	if not course_enrollment:
		utils.enroll_in_course(course_name, program_name)
	progress = course_enrollment.get_progress(student)
	count = sum([activity['is_complete'] for activity in progress])
	if count == 0:
		return {'flag':'Start Course', 'content_type': progress[0]['content_type'], 'content': progress[0]['content']}
	elif count == len(progress):
		return {'flag':'Completed', 'content_type': progress[0]['content_type'], 'content': progress[0]['content']}
	elif count < len(progress):
		next_item = next(item for item in progress if item['is_complete']==False)
		return {'flag':'Continue', 'content_type': next_item['content_type'], 'content': next_item['content']}

@frappe.whitelist()
def get_topic_meta(topic_name, course_name):
	"""
	Return the porgress of a course in a program as well as the content to continue from.
		:param topic_name:
		:param course_name:
	"""
	course_enrollment = utils.get_course_enrollment(course_name)
	student = frappe.get_doc("Student", utils.get_current_student())
	topic = frappe.get_doc("Topic", topic_name)
	progress = student.get_topic_progress(course_enrollment.name, topic)
	if not progress:
		return { 'flag':'Start Topic', 'content_type': None, 'content': None }
	count = sum([activity['is_complete'] for activity in progress])
	if count == 0:
		return {'flag':'Start Topic', 'content_type': progress[0]['content_type'], 'content': progress[0]['content']}
	elif count == len(progress):
		return {'flag':'Completed', 'content_type': progress[0]['content_type'], 'content': progress[0]['content']}
	elif count < len(progress):
		next_item = next(item for item in progress if item['is_complete']==False)
		return {'flag':'Continue', 'content_type': next_item['content_type'], 'content': next_item['content']}

@frappe.whitelist()
def get_program_progress(program_name):
	import math
	program = frappe.get_doc("Program", program_name)
	program_enrollment = utils.get_program_enrollment(program_name)
	program_meta = {}
	if not program_enrollment:
		return None
	else:
		progress = []
		for course in program.get_all_children():
			meta = get_course_meta(course.course, program_name)
			is_complete = False
			if meta['flag'] == "Completed":
				is_complete = True
			progress.append({'course_name': course.course_name, 'name': course.course, 'is_complete': is_complete})
		program_meta['progress'] = progress
		program_meta['name'] = program_name
		program_meta['program'] = program.program_name
		program_meta['percentage'] = math.ceil((sum([item['is_complete'] for item in progress] * 100)/len(progress)))
		return program_meta

@frappe.whitelist()
def get_joining_date():
	student = frappe.get_doc("Student", utils.get_current_student())
	return student.joining_date

@frappe.whitelist()
def get_quiz_progress(program_name):
	program = frappe.get_doc("Program", program_name)
	program_enrollment = utils.get_program_enrollment(program_name)
	quiz_meta = frappe._dict()
	student = frappe.get_doc("Student", utils.get_current_student())
	if not program_enrollment:
		return None
	else:
		progress_list = []
		for course in program.get_all_children():
			course_enrollment = utils.get_course_enrollment(course.course)
			meta = course_enrollment.get_progress(student)
			for progress_item in meta:
				# if progress_item['content_type'] == "Quiz" and progress_item['is_complete'] == True:
				if progress_item['content_type'] == "Quiz":
					progress_item['course'] = course.course_name
					progress_list.append(progress_item)
		quiz_meta.quiz_attempt = progress_list
		quiz_meta.name = program_name
		quiz_meta.program = program.program_name
		return quiz_meta


@frappe.whitelist(allow_guest=True)
def get_course_details(course_name):
	try:
		course = frappe.get_doc('Course', course_name)
		return course
	except:
		return None

# Functions to get program & course details
@frappe.whitelist(allow_guest=True)
def get_topics(course_name):
	course = frappe.get_doc('Course', course_name)
	topics = course.get_topics()
	return topics

@frappe.whitelist()
def get_content(type, content):
	try:
		return frappe.get_doc(type, content)
	except:
		return None