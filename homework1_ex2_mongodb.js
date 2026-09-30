use('blog_db');

// 1. Insert sample posts
db.posts.insertMany([
  {
    title: "Mastering Node.js and Express",
    category: "Tech",
    views: 150,
    author: { name: "Tran Phan Duc Khai", email: "duckhai@gmail.com" },
    tags: ["nodejs", "express", "backend"],
    comments: [
      { user: "Alice", content: "Very comprehensive tutorial!", created_at: new Date("2026-09-10T10:00:00Z") },
      { user: "Bob", content: "Helped me understand routing easily.", created_at: new Date("2026-09-11T14:30:00Z") }
    ]
  },
  {
    title: "Introduction to MongoDB and NoSQL",
    category: "Tech",
    views: 85,
    author: { name: "John Doe", email: "johndoe@example.com" },
    tags: ["mongodb", "database", "nosql"],
    comments: [
      { user: "Charlie", content: "Clear comparison with SQL.", created_at: new Date("2026-09-12T09:15:00Z") }
    ]
  },
  {
    title: "Building Modern REST APIs with Node.js",
    category: "Programming",
    views: 220,
    author: { name: "Tran Phan Duc Khai", email: "duckhai@gmail.com" },
    tags: ["nodejs", "rest-api", "api-design"],
    comments: [
      { user: "David", content: "Looking forward to part 2!", created_at: new Date("2026-09-15T16:45:00Z") }
    ]
  }
]);

// 2.Query 1: Find posts in 'Tech' category with views >= 100
db.posts.find({
  category: "Tech",
  views: { $gte: 100 }
}).pretty();

// 3.Query 2: Find all posts tagged with 'nodejs'
db.posts.find({
  tags: "nodejs"
}).pretty();

// 4.Update: Add comment and increment views by 1
db.posts.updateOne(
  { title: "Mastering Node.js and Express" },
  {
    $push: {
      comments: {
        user: "Sarah Connor",
        content: "Awesome guide, thanks for sharing!",
        created_at: new Date()
      }
    },
    $inc: { views: 1 }
  }
);

// 5.Aggregation: Calculate totalViews and totalPosts by category
db.posts.aggregate([
  {
    $group: {
      _id: "$category",
      totalViews: { $sum: "$views" },
      totalPosts: { $sum: 1 }
    }
  }
]);