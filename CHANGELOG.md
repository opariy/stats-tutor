# Changelog

All notable changes to Stats Tutor will be documented in this file.

## [0.1.0.0] - 2026-04-09

### Added
- **Professor Dashboard**: Full instructor intelligence dashboard with stuck points, misconception heatmaps, student lists, and AI-generated intervention suggestions
- **Admin Three-Pillar Metrics**: Learning metrics (mastery, topic coverage), product metrics (retention, engagement), and tech metrics (response time, error rate)
- **Demo Mode**: Showcase analytics with mastery tracking, review session modal, and demo chat interface
- **Domain-Agnostic Courses**: Per-course curriculum with chapters and topics, supporting manual, AI-generated, or material-extracted content
- **Self-Serve Learning**: Onboarding flow for individual learners to create their own study courses
- **Quiz Generation**: AI-powered assessment generation with curriculum-based multiple-choice questions
- **Bug Reports**: User feedback system for bugs, feature requests, and general feedback
- **Message Feedback**: Per-message thumbs up/down ratings with optional comments
- **Student Enrollment**: Course enrollment system with manual enrollment for pilots
- **Professor Authentication**: Secure bcrypt-based authentication for external professor users

### Changed
- Landing page reorganized with clear demo access
- Chat route now supports course-specific system prompts
- Admin sidebar expanded with new navigation items

### Fixed
- StudyChat wrapped in Suspense for useSearchParams compatibility
- Logo image aspect ratio warnings resolved
- Touch targets increased on mobile for better accessibility
