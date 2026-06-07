/** Implemented features mapped to use-case / requirements document */

export const ROLE_FEATURES = {
  reb: {
    label: 'REB Officer',
    useCases: ['Login', 'View Dashboard', 'Analyze Resource Gaps', 'Generate Reports'],
    implemented: [
      'National dashboard with enrollment trends and district comparison',
      'View all 390+ schools nationwide (read-only, paginated lists)',
      'National GIS map with district filter and GPS verification view',
      'Teacher roster and workload analysis (read-only)',
      'Forwarded feedback threads and resource alerts only',
      'PDF decision reports with executive insights',
      'Team chat: national rooms, create groups, reply-to-message',
      'Direct messages to district officers and school heads',
    ],
  },
  district: {
    label: 'District Officer',
    useCases: ['Login', 'View Dashboard', 'Register & Map School', 'Manage Inventory', 'Manage Teachers', 'Analyze Gaps', 'Generate Reports'],
    implemented: [
      'District dashboard scoped to assigned district',
      'Register schools with GPS coordinates (Use My Location)',
      'Edit school resource inventory: desks, textbooks, toilets, facilities',
      'Full teacher CRUD within district',
      'Feedback issue threads: review, resolve, close, forward to REB, reopen',
      'Resource alerts: resolve, forward to REB, reopen',
      'District GIS map locked to own district',
      'Headmasters group chat + direct individual chat',
      'PDF reports scoped to district data',
    ],
  },
  school: {
    label: 'School Head',
    useCases: ['Login', 'View Dashboard', 'Submit Updates', 'Manage Inventory', 'Manage Teachers'],
    implemented: [
      'School dashboard: inventory, facilities, teachers, enrollment',
      'Edit own school profile and resource counts',
      'GPS capture via Use My Location on school form',
      'Manage teachers for own school only',
      'Submit and track issues via feedback threads (My Issues)',
      'View resource alerts for own school',
      'Scoped PDF reports for own school',
    ],
  },
  community: {
    label: 'Community Member',
    useCases: ['Login', 'Submit Community Feedback'],
    implemented: [
      'Submit feedback reports for schools in area',
      'Track own submitted issues and thread replies',
      'Read-only school map (GIS)',
      'PDF report of own feedback submissions',
    ],
  },
  enumerator: {
    label: 'Field Enumerator',
    useCases: ['Register & Map School', 'View Dashboard'],
    implemented: [
      'Register and edit schools in assigned district',
      'GPS capture and field map for verification',
      'School list with pagination (district scope)',
      'PDF reports: schools summary and GPS coverage',
    ],
  },
  admin: {
    label: 'System Administrator',
    useCases: ['Login', 'View Dashboard'],
    implemented: [
      'System health dashboard (API, users, audit events)',
      'Create, update, and deactivate user accounts',
      'Audit logs viewer',
      'Technical access only — no education operations',
    ],
  },
}
