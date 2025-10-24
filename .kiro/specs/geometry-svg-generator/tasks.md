# Geometry SVG Generator - Implementation Tasks

## Phase 1: Core Infrastructure (MVP)

### Task 1.1: Setup Module Structure ✅

- [ ] Create `src/lib/modules/geometry/` directory
- [ ] Create subdirectories: `generators/`, `utils/`, `parser/`
- [ ] Create index files for exports
- [ ] Add module to project structure

### Task 1.2: SVG Builder Utility

- [ ] Create `utils/svgBuilder.js`
- [ ] Implement SVGBuilder class
  - [ ] Constructor with width/height
  - [ ] addLine() method
  - [ ] addCircle() method
  - [ ] addPolygon() method
  - [ ] addText() method
  - [ ] build() method (returns SVG string)
  - [ ] toDataURL() method
- [ ] Add unit tests for SVGBuilder

### Task 1.3: Math Helpers

- [ ] Create `utils/mathHelpers.js`
- [ ] Implement functions:
  - [ ] degreesToRadians()
  - [ ] radiansToDegrees()
  - [ ] calculateDistance()
  - [ ] calculateAngle()
  - [ ] rotatePoint()
  - [ ] lawOfCosines()
  - [ ] lawOfSines()
- [ ] Add unit tests for math helpers

### Task 1.4: Style Configuration

- [ ] Create `utils/styleConfig.js`
- [ ] Define default styles for:
  - [ ] Figures (stroke, fill)
  - [ ] Labels (font, color)
  - [ ] Angles (arc style)
  - [ ] Measurements
- [ ] Export style constants

### Task 1.5: Label Helper

- [ ] Create `utils/labelHelper.js`
- [ ] Implement functions:
  - [ ] createVertexLabel()
  - [ ] createAngleLabel()
  - [ ] createSideLabel()
  - [ ] positionLabel() (smart positioning)
- [ ] Add unit tests

## Phase 2: Triangle Generator

### Task 2.1: Basic Triangle Generator

- [ ] Create `generators/triangleGenerator.js`
- [ ] Implement TriangleGenerator class
- [ ] Method: fromAngles(A, B, C)
  - [ ] Validate angles sum = 180°
  - [ ] Calculate vertices coordinates
  - [ ] Generate SVG using SVGBuilder
- [ ] Add unit tests

### Task 2.2: Triangle from Sides

- [ ] Method: fromSides(a, b, c)
  - [ ] Validate triangle inequality
  - [ ] Calculate angles using law of cosines
  - [ ] Calculate vertices
  - [ ] Generate SVG
- [ ] Add unit tests

### Task 2.3: Special Triangle Types

- [ ] Method: equilateral(side)
- [ ] Method: isosceles(base, leg)
- [ ] Method: right(leg1, leg2)
- [ ] Add unit tests for each type

### Task 2.4: Triangle Annotations

- [ ] Add vertex labels (A, B, C)
- [ ] Add angle values
- [ ] Add side lengths
- [ ] Add angle arcs
- [ ] Add unit tests

## Phase 3: Other Shapes

### Task 3.1: Circle Generator

- [ ] Create `generators/circleGenerator.js`
- [ ] Implement CircleGenerator class
- [ ] Method: generate(radius, options)
  - [ ] Draw circle
  - [ ] Add center point
  - [ ] Add radius line
  - [ ] Add labels
- [ ] Add unit tests

### Task 3.2: Angle Generator

- [ ] Create `generators/angleGenerator.js`
- [ ] Implement AngleGenerator class
- [ ] Method: generate(angle, options)
  - [ ] Draw two rays
  - [ ] Draw angle arc
  - [ ] Add angle label
- [ ] Add unit tests

### Task 3.3: Quadrilateral Generator

- [ ] Create `generators/quadrilateralGenerator.js`
- [ ] Implement QuadrilateralGenerator class
- [ ] Methods:
  - [ ] square(side)
  - [ ] rectangle(width, height)
  - [ ] parallelogram(base, side, angle)
  - [ ] trapezoid(base1, base2, height)
- [ ] Add unit tests

## Phase 4: Main Service

### Task 4.1: Geometry Service

- [ ] Create `GeometryService.js`
- [ ] Implement static methods:
  - [ ] generateTriangle(params)
  - [ ] generateCircle(params)
  - [ ] generateAngle(params)
  - [ ] generateQuadrilateral(params)
- [ ] Add error handling
- [ ] Add input validation
- [ ] Add unit tests

### Task 4.2: Public API

- [ ] Create `index.js` with exports
- [ ] Export GeometryService
- [ ] Export all generators
- [ ] Export utilities
- [ ] Add JSDoc documentation

## Phase 5: Text Parser (Advanced)

### Task 5.1: Geometry Parser

- [ ] Create `parser/geometryParser.js`
- [ ] Implement GeometryParser class
- [ ] Method: detectGeometryType(text)
  - [ ] Detect triangle
  - [ ] Detect circle
  - [ ] Detect angle
  - [ ] Detect quadrilateral
- [ ] Add unit tests

### Task 5.2: Parameter Extractor

- [ ] Create `parser/parameterExtractor.js`
- [ ] Implement extraction functions:
  - [ ] extractAngles(text) - regex for "угол A = 50°"
  - [ ] extractSides(text) - regex for "сторона AB = 5"
  - [ ] extractPoints(text)
- [ ] Support multiple languages (RU, EN)
- [ ] Add unit tests

### Task 5.3: Auto-generation from Text

- [ ] Add method: GeometryService.generateFromText(text)
- [ ] Integrate parser and generators
- [ ] Handle parsing errors gracefully
- [ ] Add integration tests

## Phase 6: API Endpoints (Optional)

### Task 6.1: Generate Endpoint

- [ ] Create `src/routes/api/geometry/generate/+server.js`
- [ ] POST handler
  - [ ] Accept type and params
  - [ ] Call GeometryService
  - [ ] Return SVG and dataURL
- [ ] Add error handling
- [ ] Add integration tests

### Task 6.2: Preview Endpoint

- [ ] Create `src/routes/api/geometry/preview/+server.js`
- [ ] GET handler with query params
- [ ] Return SVG directly (Content-Type: image/svg+xml)
- [ ] Add caching headers
- [ ] Add integration tests

## Phase 7: Testing & Documentation

### Task 7.1: Comprehensive Testing

- [ ] Unit tests for all generators (>80% coverage)
- [ ] Unit tests for all utilities
- [ ] Integration tests for GeometryService
- [ ] Integration tests for API endpoints
- [ ] E2E test for full workflow

### Task 7.2: Documentation

- [ ] Add JSDoc to all public methods
- [ ] Create usage examples
- [ ] Create API documentation
- [ ] Add README.md in geometry module
- [ ] Update main project README

### Task 7.3: Error Handling

- [ ] Create GeometryError class
- [ ] Add error codes
- [ ] Add meaningful error messages
- [ ] Test all error scenarios

## Phase 8: Polish & Optimization

### Task 8.1: Visual Quality

- [ ] Fine-tune default styles
- [ ] Ensure proper proportions
- [ ] Test on different screen sizes
- [ ] Add responsive sizing

### Task 8.2: Performance

- [ ] Benchmark generation time
- [ ] Optimize math calculations
- [ ] Add caching if needed
- [ ] Profile memory usage

### Task 8.3: Accessibility

- [ ] Add SVG title and description
- [ ] Add ARIA labels
- [ ] Test with screen readers
- [ ] Ensure high contrast

## Success Criteria

- [ ] All unit tests passing (>80% coverage)
- [ ] All integration tests passing
- [ ] Generation time < 100ms
- [ ] Supports at least 10 figure types
- [ ] No changes to existing session/chat logic
- [ ] Clean, documented API
- [ ] Works standalone without dependencies

## Timeline Estimate

- Phase 1: 2-3 hours
- Phase 2: 3-4 hours
- Phase 3: 2-3 hours
- Phase 4: 1-2 hours
- Phase 5: 3-4 hours
- Phase 6: 1-2 hours
- Phase 7: 2-3 hours
- Phase 8: 1-2 hours

**Total: 15-23 hours**

## Priority

1. **High Priority (MVP):**
   - Phase 1: Core Infrastructure
   - Phase 2: Triangle Generator
   - Phase 4: Main Service

2. **Medium Priority:**
   - Phase 3: Other Shapes
   - Phase 7: Testing & Documentation

3. **Low Priority (Future):**
   - Phase 5: Text Parser
   - Phase 6: API Endpoints
   - Phase 8: Polish & Optimization
