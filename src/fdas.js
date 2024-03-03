

const generateFDASID = (year, count) => {
    const formattedCount = count.toString().padStart(3, '0');
    return `${year}-${formattedCount}`;
  };
  
  const connectAndFetchData = async () => {
    try {
      // Fetch records from fdas collection in location_hydrant database
  
      
      // Fetch records from users collection in accounts database
      const usersRecords = await User.find({}, { FDASID: 1 }).lean();
  
      // Generate and update FDASID for each record in fdas collection
      const year = 2024;
      let count = 1;
  
      // Generate and update FDASID for each record in users collection
      for (const record of usersRecords) {
        const fdasid = generateFDASID(year, count++);
        await User.updateOne({ _id: record._id }, { $set: { FDASID: fdasid } });
      }
  
      console.log('FDASID generation and update successful.');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      mongoose.disconnect();
    }
  };
  process.on('SIGINT', () => {
    mongoose.connection.close(() => {
      console.log('MongoDB disconnected through app termination');
      process.exit(0);
    });
  });
  
  connectAndFetchData();
  