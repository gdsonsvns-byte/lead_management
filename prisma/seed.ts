// import { FollowUpStatus } from "@/src/app/generated/prisma/enums";
import prisma from "@/src/lib/prisma";
// import bcrypt from "bcryptjs";


// // async function main() {
// //   const superAdminEmail = "super@admin.com";
// //   const superAdminPassword = "Priyesshrai1@";

// //   const existing = await prisma.user.findUnique({
// //     where: { email: superAdminEmail }
// //   });

// //   if (existing) {
// //     console.log("Superadmin already exists. Skipping seed.");
// //     return;
// //   }

// //   console.log("Creating SUPERADMIN user...");

// //   const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

// //   const account = await prisma.account.create({
// //     data: {
// //       businessName: "Super Admin Account",
// //       email: superAdminEmail,
// //       phone: "0000000000",
// //       location: "System",
// //       users: {
// //         create: {
// //           name: "Super Admin",
// //           email: superAdminEmail,
// //           password: hashedPassword,
// //           role: "SUPERADMIN"
// //         }
// //       }
// //     }
// //   });

// //   console.log("SUPERADMIN created successfully:");
// //   console.log("Email:", superAdminEmail);
// //   console.log("Password:", superAdminPassword);
// //   console.log("Account ID:", account.id);
// // }


// const DEFAULT_NEXT_ACTIONS = [
//   { label: "Client Converted", status: "COMPLETED", order: 1 },
//   { label: "Client not Interested", status: "CANCELLED", order: 2 },
//   { label: "Put on Backburner", status: "SKIPPED", order: 3 },
//   { label: "Client will Call", status: "PENDING", order: 4 },
//   { label: "Client will Visit", status: "PENDING", order: 5 },
//   { label: "Client will Message", status: "PENDING", order: 6 },
//   { label: "Call Client", status: "PENDING", order: 7 },
//   { label: "Message Client", status: "PENDING", order: 8 },
//   { label: "Visit Client", status: "PENDING", order: 9 },
// ];


// async function main() {
//   // const defaultNextActionType = await getDefaultNextActionType();

//   const forms = await prisma.form.findMany({
//     select: { id: true },
//   });

//   for (const form of forms) {
//     await prisma.nextActionType.createMany({
//       data: DEFAULT_NEXT_ACTIONS.map((a) => ({
//         label: a.label,
//         status: a.status as FollowUpStatus,
//         formId: form.id,
//         order: a.order,
//         isDefault: true,
//       })),
//       skipDuplicates: true,
//     });
//   }

//   console.log("✅ Default NextActionTypes attached to all forms");
// }



// // async function getDefaultNextActionType() {
// //   const actionType = await prisma.nextActionType.findMany({
// //     where: {
// //       isDefault: true,
// //       formId: null,
// //     }
// //   });

// //   if (!actionType) {
// //     throw new Error("No default NextActionType found");
// //   }

// //   return actionType;
// // }

// main()
//   .then(() => prisma.$disconnect())
//   .catch(async (err) => {
//     console.error("Seed Error:", err);
//     await prisma.$disconnect();
//     process.exit(1);
//   });


async function seed() {
  console.log("🌱 Seeding ADMIN & SUPERADMIN access...");

  /** 1️⃣ Fetch users */
  const [superAdmins, admins] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SUPERADMIN" },
      select: { id: true },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, accountId: true },
    }),
  ]);

  /** 2️⃣ Fetch forms with accountId */
  const forms = await prisma.form.findMany({
    select: {
      id: true,
      accountId: true,
    },
  });

  /** 3️⃣ Fetch responses via form relation */
  const responses = await prisma.response.findMany({
    select: {
      id: true,
      form: {
        select: {
          accountId: true,
        },
      },
    },
  });

  /**
   * ================================
   * SUPERADMIN → ALL FORMS
   * ================================
   */
  if (superAdmins.length && forms.length) {
    await prisma.formAccess.createMany({
      data: superAdmins.flatMap(sa =>
        forms.map(form => ({
          userId: sa.id,
          formId: form.id,
        }))
      ),
      skipDuplicates: true,
    });
  }

  /**
   * ================================
   * ADMIN → FORMS IN THEIR ACCOUNT
   * ================================
   */
  for (const admin of admins) {
    const accountForms = forms.filter(
      f => f.accountId === admin.accountId
    );

    if (!accountForms.length) continue;

    await prisma.formAccess.createMany({
      data: accountForms.map(form => ({
        userId: admin.id,
        formId: form.id,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * ================================
   * SUPERADMIN → ALL RESPONSES
   * ================================
   */
  for (const sa of superAdmins) {
    if (!responses.length) continue;

    // Reactivate existing inactive assignments
    await prisma.responseAssignment.updateMany({
      where: {
        userId: sa.id,
        responseId: { in: responses.map(r => r.id) },
      },
      data: { isActive: true },
    });

    // Create missing ones
    await prisma.responseAssignment.createMany({
      data: responses.map(r => ({
        userId: sa.id,
        responseId: r.id,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * ================================
   * ADMIN → RESPONSES IN THEIR ACCOUNT
   * ================================
   */
  for (const admin of admins) {
    const accountResponses = responses.filter(
      r => r.form.accountId === admin.accountId
    );

    if (!accountResponses.length) continue;

    // Reactivate
    await prisma.responseAssignment.updateMany({
      where: {
        userId: admin.id,
        responseId: { in: accountResponses.map(r => r.id) },
      },
      data: { isActive: true },
    });

    // Create missing
    await prisma.responseAssignment.createMany({
      data: accountResponses.map(r => ({
        userId: admin.id,
        responseId: r.id,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }

  console.log("✅ Seed completed successfully");
}

seed()
  .catch(err => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
