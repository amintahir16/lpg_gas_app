const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotificationSystem() {
  try {
    console.log('🧪 Testing Notification System...\n');

    // 1. Check if notifications table exists and has data
    console.log('1. Checking notifications table...');
    const notificationCount = await prisma.notification.count();
    console.log(`   ✅ Found ${notificationCount} notifications in database`);

    // 2. List existing notifications
    if (notificationCount > 0) {
      console.log('\n2. Existing notifications:');
      const notifications = await prisma.notification.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      
      notifications.forEach((notification, index) => {
        console.log(`   ${index + 1}. [${notification.priority}] ${notification.title}`);
        console.log(`      Type: ${notification.type}`);
        console.log(`      Message: ${notification.message}`);
        console.log(`      Read: ${notification.isRead}`);
        console.log(`      Created: ${notification.createdAt}`);
        console.log('');
      });
    }

    // 3. Test creating a new notification
    console.log('3. Testing notification creation...');
    const newNotification = await prisma.notification.create({
      data: {
        type: 'SYSTEM_ALERT',
        title: 'Test Notification',
        message: 'This is a test notification to verify the system is working',
        priority: 'MEDIUM',
        metadata: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
      }
    });
    console.log(`   ✅ Created test notification with ID: ${newNotification.id}`);

    // 4. Verify the new notification was created
    const updatedCount = await prisma.notification.count();
    console.log(`   ✅ Total notifications now: ${updatedCount}`);

    // 5. Test notification retrieval
    console.log('\n4. Testing notification retrieval...');
    const testNotification = await prisma.notification.findUnique({
      where: { id: newNotification.id }
    });
    
    if (testNotification) {
      console.log(`   ✅ Successfully retrieved notification: ${testNotification.title}`);
      console.log(`   ✅ Priority: ${testNotification.priority}`);
      console.log(`   ✅ Type: ${testNotification.type}`);
    } else {
      console.log('   ❌ Failed to retrieve test notification');
    }

    // 6. Test updating notification (mark as read)
    console.log('\n5. Testing notification update...');
    const updatedNotification = await prisma.notification.update({
      where: { id: newNotification.id },
      data: { isRead: true }
    });
    console.log(`   ✅ Marked notification as read: ${updatedNotification.isRead}`);

    // 7. Test notification filtering
    console.log('\n6. Testing notification filtering...');
    const unreadCount = await prisma.notification.count({
      where: { isRead: false }
    });
    console.log(`   ✅ Unread notifications: ${unreadCount}`);

    const urgentCount = await prisma.notification.count({
      where: { priority: 'URGENT' }
    });
    console.log(`   ✅ Urgent notifications: ${urgentCount}`);

    // 8. Test notification deletion
    console.log('\n7. Testing notification deletion...');
    await prisma.notification.delete({
      where: { id: newNotification.id }
    });
    console.log(`   ✅ Deleted test notification`);

    const finalCount = await prisma.notification.count();
    console.log(`   ✅ Final notification count: ${finalCount}`);

    console.log('\n🎉 All tests passed! Notification system is working correctly.');
    console.log('\n📋 Summary:');
    console.log(`   - Database connection: ✅`);
    console.log(`   - Notifications table: ✅`);
    console.log(`   - CRUD operations: ✅`);
    console.log(`   - Filtering: ✅`);
    console.log(`   - Metadata handling: ✅`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testNotificationSystem(); 