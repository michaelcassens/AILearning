# Homework 12: 3D Art with p5.js - Cosmic Food Galaxy

## Name: Grant Grady

## Project Overview
"Cosmic Food Galaxy" is a 3D abstract artwork that reimagines food items as celestial objects floating in a vibrant, colorful universe. The piece combines geometric primitives with food-inspired shapes, creating a whimsical culinary cosmos.

### Features
- **5+ 3D Primitives** | ✓ torus, sphere, cone, cylinder, ellipsoid, box (6 shapes) |
- **Different Materials** | ✓ normalMaterial, ambientMaterial, specularMaterial, textures |
- **Spatial Placement** | ✓ translate() used for each object with push()/pop() |
- **Rotation & Motion** | ✓ All objects rotate continuously on multiple axes |
- **Title Display** | ✓ "COSMIC FOOD GALAXY" displayed prominently |
- **Name Display** | ✓ Name shown in 3D space and overlay |

## Technical Implementation

### 3D Primitives Used:
1. **Torus** - Central galaxy ring (x2)
2. **Sphere** - Floating food items and decorative elements
3. **Cone** - Ice cream cone and decorative tops
4. **Cylinder** - Ice cream cone body and stems
5. **Ellipsoid** - Organic floating shape
6. **Box** - Rotating cube cluster

### Materials Applied:
- **normalMaterial()** - Ice cream cone (rainbow colors based on normals)
- **ambientMaterial()** - Cube cluster and cylinder (solid colors affected by ambient light)
- **specularMaterial()** - Food spheres and torus rings (shiny, reflective surfaces)
- **texture()** - Central torus with custom-generated swirl texture

### Lighting Setup:
- **ambientLight()** - Base illumination for all objects
- **pointLight()** - Three colored point lights at different positions
- **directionalLight()** - Top-down light for highlights

## Reflection

### Development Process

I started this project by brainstorming how to reinterpret my previous food-themed game into a 3D artwork. I wanted to create something that felt magical and cosmic while still honoring the food theme. The concept of a "food galaxy" emerged naturally, floating food items orbiting like planets around a central celestial torus.

### Use of Generative AI

I used Generative AI (specifically DeepSeek) as a **learning tool** and a **development assistant** throughout this project. Here's how I used it:

1. **Concept Development**: Brainstorming ideas for combining food themes with cosmic imagery

2. **Debugging**: When my text wasnt appearing in the rotating graphic, i used AI to discover thst it was used to the font not being loaded properly. I also used it in troubleshooting camera controls and lighting issues

3. **Material Properties**: Learning the differences between ambientMaterial, specularMaterial, and normalMaterial

**Benefits:**
- Accelerated learning of 3D concepts in p5.js
- Better understanding of transformation matrices (push/pop)
- Efficient problem-solving for complex rotation systems
- Inspiration for creative color combinations

**Challenges:**
- The AI couldn't preview visual results, so I had to iterate manually
- Understanding coordinate systems required experimentation
- Balancing performance with visual complexity

### Use of Others' Code

I referenced:
- **p5.js WEBGL Examples**: Official examples for lighting and materials
- **Coding Train (Daniel Shiffman)**: Videos on 3D rendering and camera controls
- **p5.js Reference**: Official documentation for all 3D primitive functions

All code was written by me, with AI assistance for debugging and conceptual guidance. The texture generation and particle system were adapted from common patterns but customized for this specific artwork.


### Lessons Learned

1. **3D Coordinate Systems**: Understanding the left-handed coordinate system in p5.js
2. **Transformation Matrices**: How push() and pop() isolate transformations
3. **Material Properties**: How different materials respond to light sources
4. **Performance Optimization**: Managing draw calls for smooth 60fps animation


## Assignment Requirements Checklist

- 5+ 3D primitives (torus, sphere, cone, cylinder, ellipsoid, box)
- Different materials (normalMaterial, ambientMaterial, specularMaterial, textures)
- Spatial placement (translate with push/pop for each object)
- Continuous rotation (all objects rotate on multiple axes)
- Title and name (displayed in 3D space)
- Self-contained (no external images needed - textures generated in code)
