let camX = 0;
let camY = 0;
let autoRotate = true;
let targetCamX = 0;
let targetCamY = 0;

let starTexture;
let swirlTexture;
let foodTexture;

function preload() {
    myFont = loadFont('https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceSansPro-Bold.otf');
}

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    
    createTextures();
    
    setupLights();

    if (myFont) {
        textFont(myFont);
    }

    noStroke();
    
    describe('A 3D cosmic food galaxy with floating food objects, rotating shapes, and colorful lighting');
}

function createTextures() {
    starTexture = createGraphics(512, 512);
    starTexture.background(0, 0, 0, 0);
    starTexture.noStroke();
    for (let i = 0; i < 500; i++) {
        starTexture.fill(255, 255, 255, random(100, 255));
        starTexture.circle(random(512), random(512), random(1, 3));
    }
    
    swirlTexture = createGraphics(512, 512);
    swirlTexture.background(0, 0, 0, 0);
    for (let i = 0; i < 512; i++) {
        let angle = i * 0.05;
        let r = sin(angle * 10) * 50 + 100;
        let x = 256 + cos(angle) * r;
        let y = 256 + sin(angle) * r;
        swirlTexture.stroke(255, 150, 50, 200);
        swirlTexture.strokeWeight(3);
        swirlTexture.point(x, y);
    }
    
    foodTexture = createGraphics(256, 256);
    foodTexture.background(255, 200, 100);
    foodTexture.fill(255, 100, 100);
    foodTexture.noStroke();
    for (let i = 0; i < 30; i++) {
        foodTexture.circle(random(256), random(256), random(5, 15));
    }
    foodTexture.fill(100, 255, 100);
    for (let i = 0; i < 20; i++) {
        foodTexture.rect(random(256), random(256), random(8, 12), random(8, 12));
    }
}

function setupLights() {
    ambientLight(80, 80, 100);
    
    pointLight(255, 100, 100, 200, 200, 200);
    pointLight(100, 255, 100, -200, -100, 150);
    pointLight(100, 100, 255, 100, -200, -100);
    
    directionalLight(255, 200, 150, 0, -1, -0.5);
}

function draw() {
    let r = sin(frameCount * 0.01) * 50 + 20;
    let g = sin(frameCount * 0.02) * 30 + 10;
    let b = sin(frameCount * 0.015) * 60 + 30;
    background(r, g, b);
    
    handleCamera();
    
    drawStarfield();
    
    lights();
    
    push();
    translate(0, 0, 0);
    rotateX(frameCount * 0.01);
    rotateY(frameCount * 0.02);
    rotateZ(frameCount * 0.005);
    
    texture(swirlTexture);
    torus(120, 25, 64, 64);
    pop();
    
    push();
    translate(250, -100, 100);
    rotateX(frameCount * 0.015);
    rotateZ(frameCount * 0.02);
    
    specularMaterial(255, 100, 100);
    shininess(100);
    sphere(45, 48, 48);
    
    pop();
    
    push();
    translate(-220, -80, 150);
    rotateY(frameCount * 0.025);
    rotateX(sin(frameCount * 0.02) * 0.5);
    
    normalMaterial();
    cylinder(40, 80, 32, 32);
    
    translate(0, -50, 0);
    sphere(35, 48, 48);
    translate(0, -30, 0);
    sphere(28, 48, 48);
    pop();
    
    push();
    translate(180, 120, -80);
    rotateX(frameCount * 0.02);
    rotateY(frameCount * 0.03);
    rotateZ(frameCount * 0.01);
    
    ambientMaterial(100, 200, 255);
    box(60, 60, 60);
    
    for (let i = 0; i < 6; i++) {
        push();
        let angle = frameCount * 0.04 + i * PI * 2 / 6;
        let radius = 80;
        translate(cos(angle) * radius, sin(angle) * radius, 0);
        ambientMaterial(255, 100, 200);
        box(20, 20, 20);
        pop();
    }
    pop();
        
    
    push();
    translate(150, -150, -120);
    rotateX(frameCount * 0.03);
    rotateZ(frameCount * 0.02);
    
    ambientMaterial(255, 150, 50);
    cylinder(35, 90, 48, 48);
    
    translate(0, -50, 0);
    ambientMaterial(255, 50, 50);
    cone(25, 40, 32, 32);
    pop();
    
    let foodPositions = [
        { x: -300, y: 50, z: 50, color: [255, 100, 100] },
        { x: 300, y: -50, z: 80, color: [100, 255, 100] },
        { x: 50, y: -200, z: 150, color: [255, 200, 100] },
        { x: -100, y: 200, z: -50, color: [200, 100, 255] },
        { x: 280, y: 100, z: -150, color: [100, 200, 255] }
    ];
    
    for (let i = 0; i < foodPositions.length; i++) {
        push();
        let pos = foodPositions[i];
        translate(pos.x, pos.y, pos.z);
        rotateY(frameCount * 0.02 + i);
        rotateX(frameCount * 0.015 + i * 0.5);
        
        specularMaterial(pos.color[0], pos.color[1], pos.color[2]);
        shininess(60);
        sphere(25, 32, 32);
        
        // Add stem
        push();
        translate(0, -20, 0);
        ambientMaterial(100, 80, 50);
        cylinder(4, 15, 8, 8);
        pop();
        pop();
    }
    
    push();
    translate(0, -180, -50);
    rotateX(frameCount * 0.01);
    rotateY(frameCount * 0.02);
    
    specularMaterial(255, 100, 200);
    torus(90, 12, 64, 64);
    
    push();
    rotateZ(frameCount * 0.03);
    specularMaterial(100, 255, 200);
    torus(110, 8, 64, 64);
    pop();
    pop();
    
    drawTextOverlay();
    
    drawParticles();
}

function handleCamera() {
    
    camX += 0.005;
    camY = sin(frameCount * 0.002) * 0.5;
    
    camera(
        sin(camX) * 800, camY * 200 + 200, cos(camX) * 800,
        0, 0, 0,
        0, 1, 0
    );
}

function drawStarfield() {
    push();
    rotateY(frameCount * 0.001);
    rotateX(frameCount * 0.0005);
    
    texture(starTexture);
    for (let i = 0; i < 3; i++) {
        push();
        let radius = 600;
        translate(0, 0, radius);
        plane(1200, 800);
        pop();
    }
    pop();
}

function drawParticles() {
    push();
    for (let i = 0; i < 100; i++) {
        let angle = frameCount * 0.02 + i;
        let radius = 350 + sin(angle * 2) * 30;
        let x = cos(angle) * radius;
        let y = sin(angle * 1.3) * radius * 0.7;
        let z = sin(angle * 1.7) * radius * 0.5;
        
        push();
        translate(x, y, z);
        specularMaterial(
            150 + sin(angle) * 105,
            100 + cos(angle * 1.3) * 155,
            200 + sin(angle * 1.7) * 55
        );
        sphere(3, 8, 8);
        pop();
    }
    pop();
}

function drawTextOverlay() {
    push();
    resetMatrix();
    
    fill(255, 215, 0);
    textAlign(CENTER);
    textSize(20);
    
    push();
    translate(0, -250, -100);
    rotateX(sin(frameCount * 0.01) * 0.1);
    fill(255, 200, 100);
    textSize(18);
    textAlign(CENTER);
    text("Created by Grant Grady", 0, 0);
    pop();
    
    pop();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
