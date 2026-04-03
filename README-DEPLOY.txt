Render deployment:

1. Push this folder to GitHub.
2. Create a new Web Service on Render.
3. Connect the GitHub repo.
4. Build command: npm install
5. Start command: npm start
6. Add these environment variables in Render:
   - MONGO_URI
   - GOVERNMENT_ID
   - GOVERNMENT_PASSWORD
   - SESSION_SECRET
   - PORT (optional, Render usually injects it automatically)

Government pages:
- Login page: /government
- Dashboard page: /government-dashboard
