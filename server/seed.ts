import { db } from "./db";
import { bandMembers, events } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  try {
    // Create the 4 band members as requested
    const memberData = [
      {
        name: "Lisa",
        role: "Vocals",
        icon: "fa-microphone",
        color: "#e74c3c",
      },
      {
        name: "Neil",
        role: "Guitar",
        icon: "fa-guitar",
        color: "#3498db",
      },
      {
        name: "Wayne",
        role: "Bass",
        icon: "fa-guitar",
        color: "#2ecc71",
      },
      {
        name: "Jay",
        role: "Drums",
        icon: "fa-drum",
        color: "#f39c12",
      },
    ];

    console.log("Creating band members...");
    await db.insert(bandMembers).values(memberData);

    // Create the 2 practice events as requested
    const eventData = [
      {
        type: "practice" as const,
        title: "Band Practice",
        date: "2025-08-21",
        startTime: "19:00",
        endTime: "22:00",
        location: "High Peak Studios",
        notes: "Regular band practice session",
      },
      {
        type: "practice" as const,
        title: "Band Practice",
        date: "2025-08-28",
        startTime: "19:00",
        endTime: "22:00",
        location: "High Peak Studios",
        notes: "Regular band practice session",
      },
    ];

    console.log("Creating events...");
    await db.insert(events).values(eventData);

    console.log("✅ Database seeded successfully!");
    console.log(`Created ${memberData.length} band members and ${eventData.length} events.`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seed function
seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export { seed };