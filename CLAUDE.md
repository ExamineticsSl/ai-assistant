# Claude.md - Frontend Repository Orchestration Guide
## WHS AI Assistant Frontend

**Last Updated**: August 28, 2025  
**Project**: React/TypeScript Frontend for Users and Resources Identity Provider  
**Status**: AI System Wholistic Review Phase  
**Repository**: ai-assistant (Frontend UI)  
**Current Branch**: feature/ai-system-wholistic-review  
**Merge Branch**: release/v2.7.2

---

## Repository Structure

### Frontend Architecture
```
/
├── src/
│   ├── components/           # React components
│   ├── pages/               # Page-level components
│   ├── services/            # API service layers
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   └── styles/              # CSS/styling files
├── public/                  # Static assets
├── tests/                   # Test files
├── package.json             # npm dependencies
└── README.md               # Repository overview
```

### Service Responsibilities
- **User Interface**: Authentication forms, dashboard, resource management
- **API Integration**: Connect to Whs.Ai.Api and Whs.Ai.Identity.Api services
- **ResourceType Awareness**: UI components respect ResourceType constraints
- **Responsive Design**: Support desktop, tablet, mobile interfaces

### GitHub Issues Integration
- **Repository Issues**: https://github.com/ExamineticsSl/ai-assistant/issues
- **Process**: All development work must be linked to GitHub issues
- **Quality Gates**: Follow AI Agent Code Review Framework before closing issues
- **Testing**: Unit tests (Jest), Integration tests (Cypress), Accessibility tests

---

## Implementation Status

### ✅ COMPLETED
- Repository structure established
- Basic React/TypeScript configuration

### ⏳ PENDING  
- GitHub repository integration setup
- Issues pre-population for planned features
- Authentication UI components
- Resource management interfaces
- Integration with backend APIs

---

## Development Commands

### Repository Navigation
```bash
cd "C:\Users\matthew.holton\source\repos\ExamineticsSl\ai-assistant"
```

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build production
npm run build

# Run linting
npm run lint
```

### GitHub Issues Management
```bash
# List current issues
"C:\Users\matthew.holton\source\repos\ExamineticsSl\gh.exe" issue list

# Create new issue
"C:\Users\matthew.holton\source\repos\ExamineticsSl\gh.exe" issue create --title "Issue Title" --body "Description"

# Comment on issue
"C:\Users\matthew.holton\source\repos\ExamineticsSl\gh.exe" issue comment [issue-number] --body "Progress update"

# Close resolved issue
"C:\Users\matthew.holton\source\repos\ExamineticsSl\gh.exe" issue close [issue-number]
```

---

## Key Architecture Constraints

### Frontend-Specific Constraints
- **ResourceType UI Compliance**: UI components must respect ResourceType permissions
- **Authentication Integration**: Seamless integration with Identity Provider
- **Responsive Design**: Support for multiple device types
- **Accessibility**: WCAG compliance for healthcare environments

### API Integration Requirements
- **JWT Token Handling**: Secure storage and refresh of authentication tokens
- **ResourceType Claims**: Parse and enforce ResourceType-based UI restrictions
- **Error Handling**: Graceful handling of authentication and authorization errors
- **Audit Logging**: Frontend actions logged for compliance

---

## Testing Strategy

### Frontend Testing Framework
- **Unit Tests**: Jest for component logic testing
- **Integration Tests**: React Testing Library for component integration
- **E2E Tests**: Cypress for full user workflow testing
- **Accessibility Tests**: axe-core for WCAG compliance

### Quality Gates
- **Code Coverage**: >80% for critical user flows
- **Component Testing**: All ResourceType-aware components tested
- **API Integration**: Mock API responses for consistent testing
- **Cross-Browser Testing**: Chrome, Firefox, Safari, Edge compatibility

---

## Links to Master Orchestration
- **Master Planning**: `C:\Users\matthew.holton\source\repos\ExamineticsSl\Whs-Pocs\CLAUDE.md`
- **Backend APIs**: `C:\Users\matthew.holton\source\repos\ExamineticsSl\Whs.Ai.Api\CLAUDE.md`  
- **Worker Services**: `C:\Users\matthew.holton\source\repos\ExamineticsSl\Whs.WorkerService.Ai\CLAUDE.md`
- **Code Review Framework**: `C:\Users\matthew.holton\source\repos\ExamineticsSl\Whs-Pocs\AI-Agent-Code-Review-Framework.md`

---

## Anti-Patterns (Frontend-Specific)

### UI/UX Anti-Patterns
- ❌ **Never bypass ResourceType UI restrictions** - Security boundaries must be enforced in UI
- ❌ **Never hardcode API endpoints** - Use environment-specific configuration
- ❌ **Never store sensitive data in localStorage** - Use secure token storage
- ❌ **Never ignore accessibility requirements** - Healthcare compliance mandatory

### Development Anti-Patterns  
- ❌ **Never skip component testing** - All ResourceType-aware components must be tested
- ❌ **Never commit without linting** - Code quality standards mandatory
- ❌ **Never deploy without E2E tests** - User workflow validation required

---

*This Claude.md serves as the frontend-specific orchestration guide, synchronized with master orchestration in Whs-Pocs repository.*