const db = require('./config/db'); // your db connection

async function updateTestStatuses() {
  try {
    await db.query(`
      UPDATE tests SET status = 'active'
      WHERE status = 'scheduled' 
      AND start_time <= NOW() 
      AND end_time > NOW()
    `);

    await db.query(`
      UPDATE tests SET status = 'completed'
      WHERE status IN ('scheduled','active') 
      AND end_time <= NOW()
    `);

    console.log('Statuses updated successfully');
    process.exit(0); // important! tells Render the job is done
  } catch (err) {
    console.error('Cron failed:', err);
    process.exit(1);
  }
}

updateTestStatuses();