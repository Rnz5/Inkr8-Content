const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const COLLECTION = 'themes';
const overwrite = true;
const filename = process.argv[2]

const records = [];

fs.createReadStream(filename)
  .pipe(csv())
  .on('data', (row) => {
    records.push({
      name: row.name,
      description: row.description,
      difficulty: row.difficulty,
      addedIn: row.addedIn,
      randomIndex: Math.random()
    });
  })
  .on('end', async () => {
    console.log(`Loaded ${records.length} themes from ${filename}`);
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const doc of records) {
      const docRef = db.collection(COLLECTION).doc(doc.name);
      const snapshot = await docRef.get();
      const data = { ...doc };   

      if (!snapshot.exists) {
        data.createdAt = admin.firestore.FieldValue.serverTimestamp();
        await docRef.set(data);
        added++;
      } else if (overwrite) {
        await docRef.update(data);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`Themes: Added ${added}, Updated ${updated}, Skipped ${skipped}`);
  })
  .on('error', (err) => console.error('Error:', err));