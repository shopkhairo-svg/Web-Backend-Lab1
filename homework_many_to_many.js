require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;

const MONGO_URI = 'mongodb://127.0.0.1:27017/course_registration_db';

mongoose.connect(MONGO_URI)
    .then(() => console.log('-> Connected to MongoDB successfully via Mongoose!'))
    .catch(err => console.error('MongoDB connection error:', err));

const studentSchema = new Schema({
    fullName: {
        type: String,
        required: [true, 'Student name is required'],
        trim: true
    },
    studentCode: {
        type: String,
        required: true,
        unique: true
    },
    courses: [{
        type: Schema.Types.ObjectId,
        ref: 'Course'
    }]
}, { timestamps: true });

const courseSchema = new Schema({
    courseCode: {
        type: String,
        required: true,
        unique: true
    },
    courseName: {
        type: String,
        required: true
    },
    maxStudents: {
        type: Number,
        required: true
    },
    availableSlots: {
        type: Number,
        required: true
    },
    students: [{
        type: Schema.Types.ObjectId,
        ref: 'Student'
    }]
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);
const Course = mongoose.model('Course', courseSchema);

async function enrollCourse(studentId, courseId) {
    console.log(`\n--- [ACTION] Enrolling Student [${studentId}] into Course [${courseId}] ---`);
    
    const student = await Student.findById(studentId);
    const course = await Course.findById(courseId);

    if (!student || !course) {
        throw new Error('Student or Course not found.');
    }

    const isAlreadyEnrolled = student.courses.some(cId => cId.equals(courseId));
    if (isAlreadyEnrolled) {
        throw new Error(`Enrollment Rejected: Student [${student.fullName}] is ALREADY enrolled in [${course.courseName}].`);
    }

    if (course.availableSlots <= 0) {
        throw new Error(`Enrollment Rejected: Course [${course.courseName}] is FULL. Available slots: 0.`);
    }

    student.courses.push(courseId);
    course.students.push(studentId);
    course.availableSlots -= 1;

    await student.save();
    await course.save();

    console.log(`>>> SUCCESS: Enrolled [${student.fullName}] into [${course.courseName}]. Remaining slots: ${course.availableSlots}`);
}


async function dropCourse(studentId, courseId) {
    console.log(`\n--- [ACTION] Dropping Course [${courseId}] for Student [${studentId}] ---`);

    const student = await Student.findById(studentId);
    const course = await Course.findById(courseId);

    if (!student || !course) {
        throw new Error('Student or Course not found.');
    }

    const isEnrolled = student.courses.some(cId => cId.equals(courseId));
    if (!isEnrolled) {
        throw new Error(`Drop Rejected: Student [${student.fullName}] is NOT currently enrolled in [${course.courseName}].`);
    }

    student.courses.pull(courseId);
    course.students.pull(studentId);
    
    course.availableSlots += 1;

    await student.save();
    await course.save();

    console.log(`>>> SUCCESS: Dropped [${course.courseName}] for [${student.fullName}]. Available slots restored to: ${course.availableSlots}`);
}


async function runTests() {
    try {
        await Student.deleteMany({});
        await Course.deleteMany({});

        const student1 = await Student.create({ fullName: "Tran Phan Duc Khai", studentCode: "SV001" });
        const student2 = await Student.create({ fullName: "Nguyen Van A", studentCode: "SV002" });

        const courseWeb = await Course.create({
            courseCode: "CS201",
            courseName: "Web Application & Database Development",
            maxStudents: 2,
            availableSlots: 1
        });

        console.log("-> Initial Test Data Created Successfully.");
        await enrollCourse(student1._id, courseWeb._id);

        try {
            await enrollCourse(student1._id, courseWeb._id);
        } catch (err) {
            console.error(`>>> FAILED: ${err.message}`);
        }

        try {
            await enrollCourse(student2._id, courseWeb._id);
        } catch (err) {
            console.error(`>>> FAILED: ${err.message}`);
        }
        await dropCourse(student1._id, courseWeb._id);

        await enrollCourse(student2._id, courseWeb._id);

        // In kiểm tra đối chứng dữ liệu cuối cùng có Populate
        const finalStudent = await Student.findById(student2._id).populate('courses', 'courseCode courseName');
        const finalCourse = await Course.findById(courseWeb._id).populate('students', 'fullName studentCode');

        console.log("\n================ DỮ LIỆU CUỐI CÙNG (POPULATE) ================");
        console.log("Student with populated courses:", JSON.stringify(finalStudent, null, 2));
        console.log("Course with populated students:", JSON.stringify(finalCourse, null, 2));

    } catch (error) {
        console.error("Test execution error:", error);
    } finally {
        await mongoose.connection.close();
        console.log("\n-> Database connection closed.");
    }
}

runTests();