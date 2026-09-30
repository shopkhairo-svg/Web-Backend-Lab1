require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shop_mongoose_db';

mongoose.connect(MONGO_URI)
  .then(() => console.log("-> Connected to MongoDB successfully via Mongoose ODM!"))
  .catch(err => console.error("MongoDB connection error:", err));

// 1. SCHEMA DEFINITION (Integrating Q1, Q2 -> Q4)
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  //Q5: Password field for pre-save hashing demo
  password: {
    type: String,
    default: "defaultPassword123"
  },
  //Q1: Custom Regex validator for Vietnamese phone numbers (10 digits starting with 03, 05, 07, 08, 09)
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        return /^(03|05|07|08|09)\d{8}$/.test(v);
      },
      message: props => `${props.value} is not a valid Vietnamese phone number!`
    }
  },
  age: {
    type: Number,
    min: [18, 'User age must be at least 18'],
    max: [100, 'Invalid age']
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'manager'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  //Q4: Field to support Soft Delete
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  //Q2: Ensure virtual properties are included during JSON / Object serialization
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 2. VIRTUALS, STATICS & METHODS (Must be declared before Model
//Q2: Define Virtual Property 'displayInfo'
userSchema.virtual('displayInfo').get(function() {
  return `${this.fullName} <${this.email}> [${this.role ? this.role.toUpperCase() : 'USER'}]`;
});

//Q3: Define Static Method 'findActiveByRole'
userSchema.statics.findActiveByRole = function(roleName) {
  return this.find({ role: roleName, isActive: true }).sort({ fullName: 1 });
};

//Q4: Define Instance Method 'softDelete'
userSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.isActive = false;
  return this.save();
};
//Q5.1: Pre-save Document Hook to simulate password hashing
userSchema.pre('save', function() {
  if (this.isModified('password')) {
    console.log(`[Middleware Pre-save] Hashing password for user: ${this.fullName}`);
    this.password = `hashed_${this.password}`;
  }
});

//Q5.2: Pre-find Query Hook to automatically filter out soft-deleted users
userSchema.pre(/^find/, function() {
  // Automatically append condition: isDeleted != true
  this.where({ isDeleted: { $ne: true } });
});

// 3. MODEL INITIALIZATION
const User = mongoose.model('User', userSchema);

// 4. TEST EXECUTION FUNCTIONS FOR EACH QUESTION

//QUESTION 1: Custom Regex Validation
async function runQuestion1() {
  console.log('\n');
  console.log('QUESTION 1 RESULT (PHONE REGEX)');

  try {
    await User.create({
      fullName: "Invalid Phone User",
      email: "invalid_phone@example.com",
      age: 21,
      phone: "0123456789" 
    });
  } catch (err) {
    console.log('-> [Validation Error Caught Successfully]:', err.message);
  }

  // Test valid phone number
  const validUser = await User.create({
    fullName: "Tran Phan Duc Khai",
    email: "khai.tran@example.com",
    age: 20,
    phone: "0901234567",
    password: "plainTextPassword123",
    role: "admin",
    isActive: true
  });
  console.log('-> [Valid User Created Successfully]:', {
    fullName: validUser.fullName,
    phone: validUser.phone
  });
}

async function runQuestion2() {
  console.log('\n');
  console.log('QUESTION 2 RESULT (VIRTUAL FIELD)');

  const user = await User.findOne({ email: "khai.tran@example.com" });
  if (!user) {
    console.log('User not found. Ensure runQuestion1() executed first.');
    return;
  }

  console.log('1. Direct access via getter:');
  console.log('-> displayInfo:', user.displayInfo);

  console.log('\n2. Serialized to JSON (JSON.stringify):');
  const userJson = JSON.parse(JSON.stringify(user));
  console.log({
    _id: user._id.toString(),
    fullName: userJson.fullName,
    email: userJson.email,
    role: userJson.role,
    displayInfo: userJson.displayInfo
  });
}

async function runQuestion3() {
  console.log('\n');
  console.log('QUESTION 3 RESULT (STATIC METHOD)');

  await User.create([
    { fullName: "An Van A", email: "an@example.com", phone: "0381112233", age: 24, role: "admin", isActive: true },
    { fullName: "Bao Van B", email: "bao@example.com", phone: "0771112233", age: 26, role: "admin", isActive: false },
    { fullName: "Cuong Van C", email: "cuong@example.com", phone: "0551112233", age: 22, role: "user", isActive: true }
  ]);

  const activeAdmins = await User.findActiveByRole('admin');
  console.log(`Found ${activeAdmins.length} active admin(s) (sorted A-Z):`);
  console.table(activeAdmins.map(u => ({
    ID: u._id.toString(),
    FullName: u.fullName,
    Role: u.role,
    IsActive: u.isActive
  })));
}

//QUESTION 4: Instance Method softDelete
async function runQuestion4() {
  console.log('\n');
  console.log('QUESTION 4 RESULT (SOFT DELETE)');

  const targetUser = await User.findOne({ email: "an@example.com" });
  if (!targetUser) return;

  console.log('1. State BEFORE softDelete:', {
    fullName: targetUser.fullName,
    isActive: targetUser.isActive,
    isDeleted: targetUser.isDeleted
  });

  const updatedUser = await targetUser.softDelete();

  console.log('\n2. State AFTER softDelete (Retrieved from Database):', {
    fullName: updatedUser.fullName,
    isActive: updatedUser.isActive,   
    isDeleted: updatedUser.isDeleted 
  });
}

async function runQuestion5() {
  console.log('\n');
  console.log('QUESTION 5 RESULT (PRE-SAVE & PRE-FIND HOOKS)');

  // 1. Verify Pre-save Hook (Password Hashing)
  const user = await User.findOne({ email: "khai.tran@example.com" });
  console.log('1. [Pre-save Hook Verification]:');
  console.log('-> Stored Password in DB:', user.password); // Expected: hashed_plainTextPassword123

  // 2. Verify Pre-find Query Hook (Automatic Soft-Delete Filter)
  console.log('\n2. [Pre-find Hook Verification]:');
  const visibleUsers = await User.find();
  console.log(`Total users returned by User.find(): ${visibleUsers.length}`);
  console.table(visibleUsers.map(u => ({
    FullName: u.fullName,
    Email: u.email,
    IsActive: u.isActive,
    IsDeleted: u.isDeleted
  })));
  console.log("-> Notice: 'An Van A' (isDeleted: true) is automatically excluded from results!");
}

// 5. MAIN CONTROLLER FUNCTION
async function main() {
  try {
    // Clear collection before execution
    await User.deleteMany({});

    // Execute questions sequentially
    await runQuestion1();
    await runQuestion2();
    await runQuestion3();
    await runQuestion4();
    await runQuestion5();

  } catch (error) {
    console.error("Execution Error:", error.message);
  } finally {
    // Close database connection once all tasks finish
    await mongoose.connection.close();
    console.log("\n-> Mongoose connection closed safely.");
  }
}

main();