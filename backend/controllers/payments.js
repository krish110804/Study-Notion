const mailSender = require('../utils/mailSender');
const { courseEnrollmentEmail } = require('../mail/templates/courseEnrollmentEmail');
require('dotenv').config();

const User = require('../models/user');
const Course = require('../models/course');
const CourseProgress = require("../models/courseProgress");
const { default: mongoose } = require('mongoose');

// ================== Enroll Students (mock payment) ==================
exports.capturePayment = async (req, res) => {
    const { coursesId } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!Array.isArray(coursesId) || coursesId.length === 0) {
        return res.status(400).json({ success: false, message: "Please provide valid Course Id(s)" });
    }

    let totalAmount = 0;

    for (const course_id of coursesId) {
        try {
            const course = await Course.findById(course_id);
            if (!course) {
                return res.status(404).json({ success: false, message: "Could not find the course" });
            }

            if (course.studentsEnrolled.includes(userId)) {
                return res.status(400).json({ success: false, message: `Already Enrolled in course: ${course.courseName}` });
            }

            totalAmount += course.price;
        } catch (error) {
            console.log(error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    try {
        const result = await enrollStudents(coursesId, userId);
        if (!result.success) {
            return res.status(500).json({ success: false, message: result.message });
        }

        return res.status(200).json({
            success: true,
            message: "Enrollment successful (payment mocked)",
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Enrollment failed" });
    }
};

// ================== Enrollment Logic ==================
const enrollStudents = async (courses, userId) => {
    if (!courses || !userId) {
        return { success: false, message: "Missing data" };
    }

    try {
        for (const courseId of courses) {
            const enrolledCourse = await Course.findOneAndUpdate(
                { _id: courseId },
                { $push: { studentsEnrolled: userId } },
                { new: true }
            );

            if (!enrolledCourse) {
                return { success: false, message: "Course not found" };
            }

            const courseProgress = await CourseProgress.create({
                courseID: courseId,
                userId: userId,
                completedVideos: [],
            });

            const enrolledStudent = await User.findByIdAndUpdate(
                userId,
                {
                    $push: {
                        courses: courseId,
                        courseProgress: courseProgress._id,
                    },
                },
                { new: true }
            );

            await mailSender(
                enrolledStudent.email,
                `Successfully Enrolled into ${enrolledCourse.courseName}`,
                courseEnrollmentEmail(enrolledCourse.courseName, `${enrolledStudent.firstName}`)
            );
        }

        return { success: true };
    } catch (error) {
        console.log(error);
        return { success: false, message: error.message };
    }
};

// ================== Optional Email for Razorpay Payment ==================
exports.sendPaymentSuccessEmail = async (req, res) => {
    const { orderId, paymentId, amount } = req.body;
    const userId = req.user.id;

    if (!orderId || !paymentId || !amount || !userId) {
        return res.status(400).json({ success: false, message: "Please provide all the fields" });
    }

    try {
        const enrolledStudent = await User.findById(userId);
        await mailSender(
            enrolledStudent.email,
            `Payment Received`,
            `Hi ${enrolledStudent.firstName}, your payment of ₹${amount / 100} has been received. Order: ${orderId}, Payment: ${paymentId}`
        );

        return res.status(200).json({ success: true, message: "Email sent" });
    } catch (error) {
        console.log("Error in sending mail", error);
        return res.status(500).json({ success: false, message: "Could not send email" });
    }
};

// ================== Placeholder for verifyPayment ==================
exports.verifyPayment = (req, res) => {
    // Future implementation if Razorpay is used
    return res.status(200).json({ success: true, message: "Payment verification logic not implemented (mock mode)" });
};
