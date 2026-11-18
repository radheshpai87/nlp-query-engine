// =============================================================================
// Ambiguity-Aware NLP Query Engine - MongoDB Target Seed Script
// =============================================================================

db = db.getSiblingDB("analytics_demo");

// Create events collection
db.createCollection("events");
db.events.createIndex({ "user_id": 1 });
db.events.createIndex({ "event_type": 1 });
db.events.createIndex({ "timestamp": -1 });

db.events.insertMany([
  {
    event_id: "evt_001",
    user_id: "usr_1",
    customer_id: 1,
    event_type: "page_view",
    path: "/products/TECH-LAP-001",
    device: "mobile",
    country: "US",
    duration_seconds: 42,
    timestamp: new Date("2025-05-10T13:45:00Z")
  },
  {
    event_id: "evt_002",
    user_id: "usr_1",
    customer_id: 1,
    event_type: "cart_add",
    product_id: 1,
    device: "mobile",
    country: "US",
    timestamp: new Date("2025-05-10T13:50:00Z")
  },
  {
    event_id: "evt_003",
    user_id: "usr_1",
    customer_id: 1,
    event_type: "checkout",
    order_id: 1,
    amount: 1548.99,
    device: "mobile",
    country: "US",
    timestamp: new Date("2025-05-10T14:00:00Z")
  },
  {
    event_id: "evt_004",
    user_id: "usr_2",
    customer_id: 2,
    event_type: "search",
    query: "high performance phone",
    device: "desktop",
    country: "CA",
    timestamp: new Date("2025-05-12T11:15:00Z")
  },
  {
    event_id: "evt_005",
    user_id: "usr_2",
    customer_id: 2,
    event_type: "checkout",
    order_id: 2,
    amount: 899.50,
    device: "desktop",
    country: "CA",
    timestamp: new Date("2025-05-12T11:30:00Z")
  },
  {
    event_id: "evt_006",
    user_id: "usr_4",
    customer_id: 4,
    event_type: "page_view",
    path: "/category/appliances",
    device: "tablet",
    country: "US",
    duration_seconds: 120,
    timestamp: new Date("2025-05-15T16:20:00Z")
  },
  {
    event_id: "evt_007",
    user_id: "usr_4",
    customer_id: 4,
    event_type: "checkout",
    order_id: 3,
    amount: 399.99,
    device: "tablet",
    country: "US",
    timestamp: new Date("2025-05-15T16:45:00Z")
  },
  {
    event_id: "evt_008",
    user_id: "usr_5",
    customer_id: 5,
    event_type: "page_view",
    path: "/products/HOME-COF-004",
    device: "desktop",
    country: "DE",
    duration_seconds: 85,
    timestamp: new Date("2025-05-20T09:05:00Z")
  },
  {
    event_id: "evt_009",
    user_id: "usr_5",
    customer_id: 5,
    event_type: "checkout",
    order_id: 4,
    amount: 549.00,
    device: "desktop",
    country: "DE",
    timestamp: new Date("2025-05-20T09:15:00Z")
  },
  {
    event_id: "evt_010",
    user_id: "usr_6",
    customer_id: 6,
    event_type: "checkout",
    order_id: 5,
    amount: 319.45,
    device: "mobile",
    country: "FR",
    timestamp: new Date("2025-05-25T13:00:00Z")
  }
]);

// Create reviews collection
db.createCollection("reviews");
db.reviews.createIndex({ "product_id": 1 });
db.reviews.createIndex({ "rating": -1 });

db.reviews.insertMany([
  {
    review_id: "rev_101",
    product_id: 1,
    customer_name: "Alice Smith",
    rating: 5,
    title: "Best Laptop Ever",
    comment: "Outstanding battery life, crisp display, and blazing performance.",
    verified_purchase: true,
    created_at: new Date("2025-05-15T10:00:00Z")
  },
  {
    review_id: "rev_102",
    product_id: 1,
    customer_name: "George Clark",
    rating: 4,
    title: "Solid machine with premium feel",
    comment: "Runs everything smoothly. Slightly heavy charger, but great value.",
    verified_purchase: true,
    created_at: new Date("2025-06-20T14:30:00Z")
  },
  {
    review_id: "rev_103",
    product_id: 2,
    customer_name: "Bob Jones",
    rating: 5,
    title: "Flagship camera quality",
    comment: "Photos look incredible even in low light. Snappy OS.",
    verified_purchase: true,
    created_at: new Date("2025-05-18T09:15:00Z")
  },
  {
    review_id: "rev_104",
    product_id: 3,
    customer_name: "Julia Roberts",
    rating: 4,
    title: "Great active noise canceling",
    comment: "Silences airplane cabin noise completely. Cushions are very comfortable.",
    verified_purchase: true,
    created_at: new Date("2025-06-22T11:45:00Z")
  },
  {
    review_id: "rev_105",
    product_id: 4,
    customer_name: "Evan Wright",
    rating: 5,
    title: "Café quality espresso at home",
    comment: "Easy to clean, heats up fast, rich crema every morning.",
    verified_purchase: true,
    created_at: new Date("2025-05-28T08:00:00Z")
  },
  {
    review_id: "rev_106",
    product_id: 5,
    customer_name: "Diana Prince",
    rating: 5,
    title: "Saves hours every week",
    comment: "Navigates around furniture like a charm and cleans carpets thoroughly.",
    verified_purchase: true,
    created_at: new Date("2025-05-20T17:10:00Z")
  },
  {
    review_id: "rev_107",
    product_id: 6,
    customer_name: "Fiona Gallagher",
    rating: 4,
    title: "Warm and completely waterproof",
    comment: "Tested in heavy downpour, stayed bone dry.",
    verified_purchase: true,
    created_at: new Date("2025-06-02T16:20:00Z")
  },
  {
    review_id: "rev_108",
    product_id: 7,
    customer_name: "Hannah Abbott",
    rating: 5,
    title: "Lightweight trail grip",
    comment: "Perfect arch support and great traction on wet gravel.",
    verified_purchase: true,
    created_at: new Date("2025-07-28T10:15:00Z")
  },
  {
    review_id: "rev_109",
    product_id: 8,
    customer_name: "Alice Smith",
    rating: 4,
    title: "Reliable sleep tracking",
    comment: "Battery lasts a full week. Syncs seamlessly with phone.",
    verified_purchase: true,
    created_at: new Date("2025-06-08T12:00:00Z")
  },
  {
    review_id: "rev_110",
    product_id: 10,
    customer_name: "Diana Prince",
    rating: 5,
    title: "Sturdy standing desk",
    comment: "Dual motors are whisper quiet and height presets work flawlessly.",
    verified_purchase: true,
    created_at: new Date("2025-07-08T19:30:00Z")
  }
]);
