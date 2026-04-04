const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const COLLECTION = 'words';
const overwrite = true;   // false to add new words

const filename = process.argv[2];
const records = [];

fs.createReadStream(filename)
  .pipe(csv())
  .on('data', (row) => {
    records.push({
      word: row.word,
      type: row.type,
      definition: row.definition,
      sentence: row.sentence,
      pronunciation: row.pronunciation,
      frequencyScore: parseInt(row.frequencyScore, 10),
      isActive: row.isActive === 'TRUE' || row.isActive === 'true',
      addedIn: row.addedIn
    });
  })
  .on('end', async () => {
    console.log(`Loaded ${records.length} words from ${filename}`);
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const doc of records) {
      const docRef = db.collection(COLLECTION).doc(doc.word);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        const newData = { ...doc };
        newData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        await docRef.set(newData);
        added++;
      } else if (overwrite) {
        const updateData = { ...doc };
        await docRef.update(updateData);
        updated++;
      } else {
        skipped++;
      }
    }

    console.log(`Done. Added: ${added}, Updated: ${updated}, Skipped: ${skipped}`);
  })
  .on('error', (err) => {
    console.error('Error reading CSV:', err);
  });