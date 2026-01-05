import { FollowUpStatus } from "@/src/app/generated/prisma/enums";
import prisma from "@/src/lib/prisma";
import bcrypt from "bcryptjs";


// async function main() {
//   const superAdminEmail = "super@admin.com";
//   const superAdminPassword = "Priyesshrai1@";

//   const existing = await prisma.user.findUnique({
//     where: { email: superAdminEmail }
//   });

//   if (existing) {
//     console.log("Superadmin already exists. Skipping seed.");
//     return;
//   }

//   console.log("Creating SUPERADMIN user...");

//   const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

//   const account = await prisma.account.create({
//     data: {
//       businessName: "Super Admin Account",
//       email: superAdminEmail,
//       phone: "0000000000",
//       location: "System",
//       users: {
//         create: {
//           name: "Super Admin",
//           email: superAdminEmail,
//           password: hashedPassword,
//           role: "SUPERADMIN"
//         }
//       }
//     }
//   });

//   console.log("SUPERADMIN created successfully:");
//   console.log("Email:", superAdminEmail);
//   console.log("Password:", superAdminPassword);
//   console.log("Account ID:", account.id);
// }


const DEFAULT_NEXT_ACTIONS = [
  { label: "Client Converted", status: "COMPLETED" },
  { label: "Client not Interested", status: "CANCELLED" },
  { label: "Put on Backburner", status: "SKIPPED" },
  { label: "Client will Call", status: "PENDING" },
  { label: "Client will Visit", status: "PENDING" },
  { label: "Client will Message", status: "PENDING" },
  { label: "Call Client", status: "PENDING" },
  { label: "Message Client", status: "PENDING" },
  { label: "Visit Client", status: "PENDING" },
];


async function main() {
  for (const action of DEFAULT_NEXT_ACTIONS) {
    // const exists = await prisma.nextActionType.findFirst({
    //   where: {
    //     label: action.label,
    //     isDefault: true,
    //   },
    // });

    // if (!exists) {
    await prisma.nextActionType.create({
      data: {
        label: action.label,
        status: action.status as FollowUpStatus,
        isDefault: true,
      },
    });
    // }
  }

  console.log("✅ Default NextActionTypes seeded");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("Seed Error:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
