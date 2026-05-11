const fs = require('fs');
const { google } = require('googleapis');
const creds = JSON.parse(fs.readFileSync('scripts/service-account.json','utf8'));
const auth = new google.auth.JWT({email:creds.client_email,key:creds.private_key,scopes:['https://www.googleapis.com/auth/spreadsheets']});
const sheets = google.sheets({version:'v4',auth});
const SHEET_ID = '13grSBTA59EmnK9x7IFJ7vZrMw2-xuCic_BDf0f1oqr8';

const SIZE = '=w1600';
const URLS = {
  2:  'https://lh3.googleusercontent.com/pw/AP1GczP61c6r1FCVuQ8nD8nMyhyQwiCnd5a1TETU72m6O3hwMFftCsOGH9WjQtfnq7Y7Niquhi6Af70hgQuYH_oopNpWngzXQtJY1nGlvG0TlFMH3eRF48aC' + SIZE,
  3:  'https://lh3.googleusercontent.com/pw/AP1GczPQ-3KQPRse-g2KNNxfEFxFPfHzvL4zSETLa0pKCxS0MWznttNFSUIQyz3REp5Oz7BV8is6kXbCUL9-uiZwDlqvEy9YPCnRh5Mui2CD_Uvl5BeiZPpj' + SIZE,
  4:  'https://lh3.googleusercontent.com/pw/AP1GczOaCWgUYUF0EL_PuV8bfR1gjapy8gcxS2xqPue9wvaq-Gt-_LnbiUz5ltmD22IbcaaJtjtcNuhxnO6IlZAi_-ueFoAY9VRBTUkwGXdyY4MGd0vs5n-z' + SIZE,
  5:  'https://lh3.googleusercontent.com/pw/AP1GczNQxQFEh_lZxHDYnjxIKRCT3MnUYjLhLVVw_shqSqYjKWE67NeebPSZU6ZE6pAn7rkhODXwUK2YhyOH6I3jnOOknbmhk05oSpl-MVu4yqsaNMKqpptY' + SIZE,
  7:  'https://lh3.googleusercontent.com/pw/AP1GczO4oS7Kz9Rmg86uZN80PPmnfgcBb3fio3qTuAWz64zc9wcKtUJkFGSNFIfDdhUmM5rYEYCWj4pBpUPMK161sewjAi2olHVrgLluniNNCqytqniIWqNO' + SIZE,
  10: 'https://lh3.googleusercontent.com/pw/AP1GczNRs24ZYR5YLs18FN56iZNbqo8sZSRLvu9_RWeAcaO_S781T4nrZd03FbslfhrpiTUmDrSLaYr0qdslZ-bP2StGLoK-Dtny02wUKhevBVH8T5cDFwYG' + SIZE,
  11: 'https://lh3.googleusercontent.com/pw/AP1GczPsIjCphiyUJ-NfL3I7ZUC6QkLZ9KSEKI5eKY154u3DiHGnzwvdEuNYiooBMO3PpdW9l8-C-UtrP2hQXiNaRGA3LLLYc4doiLDM8FyIEX-mkzdvto_g' + SIZE,
  12: 'https://lh3.googleusercontent.com/pw/AP1GczNRs24ZYR5YLs18FN56iZNbqo8sZSRLvu9_RWeAcaO_S781T4nrZd03FbslfhrpiTUmDrSLaYr0qdslZ-bP2StGLoK-Dtny02wUKhevBVH8T5cDFwYG' + SIZE,
};
(async () => {
  const r = await sheets.spreadsheets.values.get({spreadsheetId: SHEET_ID, range: 'itinerary!A:G'});
  const rows = r.data.values || [];
  const updates = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row[0] !== 'thailand-apr-2026') continue;
    const day = parseInt(row[1], 10);
    if (!(day in URLS)) continue;
    updates.push({range: `itinerary!G${i+1}`, values: [[URLS[day]]]});
    console.log(`  · Thailand day ${day} → ${URLS[day].slice(0,60)}...`);
  }
  await sheets.spreadsheets.values.batchUpdate({spreadsheetId: SHEET_ID, requestBody: {valueInputOption: 'RAW', data: updates}});
  console.log(`✓ Updated ${updates.length} images.`);
})();
