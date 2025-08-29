'use strict';

/**
 * Seeds:
 * - Group: "Public Group" (slug: "public")
 * - User:  "TestUser" (email: testuser@example.com)
 * - Membership: TestUser ∈ Public Group
 * - 6 Prayers (varied categories/status)
 * - Participants: TestUser on all prayers
 * - Updates: a couple of example updates
 *
 * Notes:
 * - passwordHash is a precomputed bcrypt hash (dummy). Change later as needed.
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // 1) GROUP
        await queryInterface.bulkInsert(
            'groups',
            [
                {
                    name: 'Public Group',
                    slug: 'public',
                    groupEmail: process.env.GROUP_EMAIL || 'group@example.com',
                    createdAt: now,
                    updatedAt: now
                }
            ],
            {}
        );
        const [groupRows] = await queryInterface.sequelize.query(
            'SELECT id FROM "groups" WHERE slug = :slug LIMIT 1',
            { replacements: { slug: 'public' } }
        );
        const groupId = groupRows[0].id;

        // 2) USER (role: classic)
        // bcrypt hash of "Password123!" generated offline (cost 10). Replace later if desired.
        const passwordHash =
            '$2b$10$Z1xX7Q8bHbR/xQk7Qd7GkOQ1b7y0h5hW8Hc1G5m2sQm5p8cY7wGSu';
        await queryInterface.bulkInsert(
            'users',
            [
                {
                    name: 'TestUser',
                    phone: '555-0100',
                    email: 'testuser@example.com',
                    passwordHash,
                    role: 'classic',
                    emailVerified: true,

                    addressStreet: '123 Main St',
                    addressCity: 'Austin',
                    addressState: 'TX',
                    addressZip: '78701',
                    spouseName: null,

                    createdAt: now,
                    updatedAt: now
                }
            ],
            {}
        );
        const [userRows] = await queryInterface.sequelize.query(
            'SELECT id FROM "users" WHERE email = :email LIMIT 1',
            { replacements: { email: 'testuser@example.com' } }
        );
        const userId = userRows[0].id;

        // 3) MEMBERSHIP
        await queryInterface.bulkInsert(
            'groupMembers',
            [
                {
                    userId,
                    groupId,
                    createdAt: now,
                    updatedAt: now
                }
            ],
            {}
        );

        // 4) PRAYERS (6 total; varied categories/status)
        const prayers = [
            {
                title: 'Surgery Recovery for Alex',
                content:
                    'Praying for successful recovery and strength during rehab this month.',
                category: 'prayer', // enum
                status: 'active', // enum
                position: 1
            },
            {
                title: 'Job Provision for Maria',
                content: 'Asking for open doors and wisdom in the job search process.',
                category: 'prayer',
                status: 'active',
                position: 2
            },
            {
                title: 'Long-term: Chronic Pain for John',
                content:
                    'Ongoing pain management and endurance; comfort and restful sleep.',
                category: 'long-term',
                status: 'active',
                position: 3
            },
            {
                title: 'Prayer for Salvation – Neighbor',
                content:
                    'Opportunities to share faith with our neighbor and receptive hearts.',
                category: 'salvation',
                status: 'active',
                position: 4
            },
            {
                title: 'Pregnancy: Baby Smith',
                content:
                    'Healthy pregnancy and delivery; peace for the family as due date nears.',
                category: 'pregnancy',
                status: 'active',
                position: 5
            },
            {
                title: 'Praise: Healthy Birth for Lily',
                content:
                    'Giving thanks for a healthy delivery; mom and baby are doing well!',
                category: 'birth',
                status: 'praise',
                position: 6
            }
        ].map((p) => ({
            groupId,
            authorUserId: userId,
            title: p.title,
            content: p.content,
            category: p.category,
            status: p.status,
            position: p.position,
            impersonatedByAdminId: null,
            createdAt: now,
            updatedAt: now
        }));

        await queryInterface.bulkInsert('prayers', prayers, {});

        // Grab the IDs of the 6 prayers we just inserted (by titles)
        const [prayerRows] = await queryInterface.sequelize.query(
            `
        SELECT id, title FROM "prayers"
        WHERE "groupId" = :groupId AND "authorUserId" = :userId
          AND title IN (
            'Surgery Recovery for Alex',
            'Job Provision for Maria',
            'Long-term: Chronic Pain for John',
            'Prayer for Salvation – Neighbor',
            'Pregnancy: Baby Smith',
            'Praise: Healthy Birth for Lily'
          )
        ORDER BY position ASC
      `,
            { replacements: { groupId, userId } }
        );

        // 5) PARTICIPANTS: link TestUser to each prayer
        const participants = prayerRows.map((pr) => ({
            prayerId: pr.id,
            userId,
            createdAt: now,
            updatedAt: now
        }));
        await queryInterface.bulkInsert('prayerParticipants', participants, {});

        // 6) A couple of updates on two prayers
        const target = Object.fromEntries(
            prayerRows.map((r) => [r.title, r.id])
        );
        const updates = [
            {
                prayerId: target['Surgery Recovery for Alex'],
                authorUserId: userId,
                content: 'Update: surgery went well. Beginning PT next week.',
                createdAt: now,
                updatedAt: now
            },
            {
                prayerId: target['Praise: Healthy Birth for Lily'],
                authorUserId: userId,
                content:
                    'Update: mom and baby returned home; continued prayers for rest.',
                createdAt: now,
                updatedAt: now
            }
        ];
        await queryInterface.bulkInsert('prayerUpdates', updates, {});
    },

    async down(queryInterface, Sequelize) {
        // Look up IDs for cleanup
        const [[user]] = await Promise.all([
            queryInterface.sequelize.query(
                'SELECT id FROM "users" WHERE email = :email LIMIT 1',
                { replacements: { email: 'testuser@example.com' } }
            )
        ]);
        const userId = user?.id;

        const [[group]] = await Promise.all([
            queryInterface.sequelize.query(
                'SELECT id FROM "groups" WHERE slug = :slug LIMIT 1',
                { replacements: { slug: 'public' } }
            )
        ]);
        const groupId = group?.id;

        // Delete updates (by author + group scope)
        await queryInterface.sequelize.query(
            `
        DELETE FROM "prayerUpdates"
        WHERE "authorUserId" = :userId
          AND "prayerId" IN (SELECT id FROM "prayers" WHERE "groupId" = :groupId)
      `,
            { replacements: { userId, groupId } }
        );

        // Delete participants
        await queryInterface.sequelize.query(
            `
        DELETE FROM "prayerParticipants"
        WHERE "userId" = :userId
          AND "prayerId" IN (SELECT id FROM "prayers" WHERE "groupId" = :groupId)
      `,
            { replacements: { userId, groupId } }
        );

        // Delete the six prayers by titles (scoped to group/user)
        await queryInterface.sequelize.query(
            `
        DELETE FROM "prayers"
        WHERE "groupId" = :groupId
          AND "authorUserId" = :userId
          AND title IN (
            'Surgery Recovery for Alex',
            'Job Provision for Maria',
            'Long-term: Chronic Pain for John',
            'Prayer for Salvation – Neighbor',
            'Pregnancy: Baby Smith',
            'Praise: Healthy Birth for Lily'
          )
      `,
            { replacements: { groupId, userId } }
        );

        // Delete membership
        await queryInterface.sequelize.query(
            `
        DELETE FROM "groupMembers"
        WHERE "userId" = :userId AND "groupId" = :groupId
      `,
            { replacements: { userId, groupId } }
        );

        // Delete user & group
        await queryInterface.sequelize.query(
            'DELETE FROM "users" WHERE email = :email',
            { replacements: { email: 'testuser@example.com' } }
        );
        await queryInterface.sequelize.query(
            'DELETE FROM "groups" WHERE slug = :slug',
            { replacements: { slug: 'public' } }
        );
    }
};
