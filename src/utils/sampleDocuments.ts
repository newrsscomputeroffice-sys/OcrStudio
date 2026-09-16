/**
 * Creates high-fidelity synthetic sample documents rendered on canvas as real image files
 * for instant testing of messy handwriting, poor lighting, and complex tables.
 */

export function createSampleDocument(
  type: 'handwriting' | 'poor-lighting' | 'invoice-table' | 'math-formulas'
): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d')!;

    if (type === 'math-formulas') {
      // Math & Physics Exam Sheet (Engineering & Algebra)
      ctx.fillStyle = '#fbfcfe';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Light blue grid pattern for engineering math paper
      ctx.strokeStyle = '#e0e7ff';
      ctx.lineWidth = 0.8;
      for (let x = 40; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 40; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Red left margin line
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(100, 0);
      ctx.lineTo(100, canvas.height);
      ctx.stroke();

      // Header
      ctx.fillStyle = '#1e1b4b';
      ctx.font = 'bold 34px serif';
      ctx.fillText('HIGHER MATHEMATICS & PHYSICS ASSIGNMENT', 130, 90);
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Topic: Calculus, Quadratic Equations & Matrix Algebra', 130, 125);
      ctx.fillText('Student ID: MATH-2026-94 | Batch: Advanced Sciences', 130, 155);

      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(110, 180);
      ctx.lineTo(canvas.width - 80, 180);
      ctx.stroke();

      // Math Formulas rendered cleanly in dark blue ink
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px serif';
      ctx.fillText('1. Quadratic Equation & General Roots Formulation:', 130, 240);

      ctx.font = 'italic 28px "Cambria Math", "Times New Roman", serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('Given standard quadratic equation:  a x² + b x + c = 0, (a ≠ 0)', 150, 290);
      ctx.fillText('Discriminant:  Δ = b² - 4ac', 150, 340);
      ctx.fillText('Roots by Quadratic Formula:  x = (-b ± √(b² - 4ac)) / (2a)', 150, 400);

      // Section 2: Definite Integral & Derivatives
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px serif';
      ctx.fillText('2. Differential & Integral Calculus:', 130, 480);

      ctx.font = 'italic 28px "Cambria Math", "Times New Roman", serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('Evaluate definite integral:  ∫₀^π  sin(x) dx = [-cos(x)]₀^π = 1 - (-1) = 2', 150, 535);
      ctx.fillText('Gaussian Integral:  ∫₋∞^∞  e^(-x²) dx = √π', 150, 595);
      ctx.fillText('Chain Rule:  d/dx [ sin²(x) + cos²(x) ] = 2 sin(x) cos(x) - 2 cos(x) sin(x) = 0', 150, 655);
      ctx.fillText('Summation series:  ∑ₙ₌₁^∞ (1 / n²) = π² / 6', 150, 715);

      // Section 3: Physics & Scientific Laws
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px serif';
      ctx.fillText('3. Fundamental Physics Equations:', 130, 795);

      ctx.font = 'italic 28px "Cambria Math", "Times New Roman", serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('Mass-Energy Equivalence:  E = m · c²', 150, 850);
      ctx.fillText('Newtonian Gravitation:  F = G · (m₁ · m₂) / r²', 150, 910);
      ctx.fillText('Wave Frequency Relation:  v = λ · f  (where λ is wavelength)', 150, 970);
      ctx.fillText('Schrödinger Time-Dependent:  i ℏ (∂ψ/∂t) = Ĥ ψ', 150, 1030);

      // Section 4: Linear Algebra & Matrices
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px serif';
      ctx.fillText('4. Linear Algebra (Matrix Determinant):', 130, 795);

      ctx.font = 'italic 28px "Cambria Math", "Times New Roman", serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('Matrix  A = [ [ 4 , 3 ] , [ 2 , 5 ] ]', 150, 850);
      ctx.fillText('det(A) = |A| = (4 · 5) - (3 · 2) = 20 - 6 = 14', 150, 905);

      // Section 5: Geometry & Trigonometry with Real Geometric Figures
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px serif';
      ctx.fillText('5. Geometry & Trigonometry Problem (with Figures):', 130, 980);

      ctx.font = 'italic 26px "Cambria Math", "Times New Roman", serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('Question A: In right-angled triangle ABC (Fig. 1), ∠B = 90°, AB = 3 cm, BC = 4 cm.', 150, 1030);
      ctx.fillText('Using Pythagoras theorem:  AC² = AB² + BC²  ⟹  AC = √(3² + 4²) = 5 cm', 150, 1075);
      ctx.fillText('Trigonometric ratios:  sin(θ) = 3/5 = 0.6,   cos(θ) = 4/5 = 0.8,   tan(θ) = 3/4 = 0.75', 150, 1120);

      ctx.fillText('Question B: In Fig. 2, circle with center O and radius r = 5 cm has tangent PT touching at T.', 150, 1180);
      ctx.fillText('Since radius ⊥ tangent at point of contact:  ∠OTP = 90°', 150, 1225);

      // DRAW REAL GEOMETRIC FIGURES ON THE CANVAS
      // FIGURE 1: Right-Angled Triangle ABC
      ctx.save();
      // Diagram frame box
      ctx.strokeStyle = '#c7d2fe';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.fillRect(160, 1260, 420, 260);
      ctx.strokeRect(160, 1260, 420, 260);

      // Title
      ctx.fillStyle = '#4338ca';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('Fig 1: Right Triangle ABC (Pythagoras)', 180, 1290);

      // Triangle vertices: A(240, 1340), B(240, 1470), C(460, 1470)
      ctx.beginPath();
      ctx.moveTo(240, 1340); // A
      ctx.lineTo(240, 1470); // B
      ctx.lineTo(460, 1470); // C
      ctx.closePath();
      ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.fill();
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Right angle square at B
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(240, 1446, 24, 24);

      // Angle arc at C
      ctx.beginPath();
      ctx.arc(460, 1470, 36, Math.PI, Math.PI * 1.18);
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vertex and side labels
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px "Cambria Math", serif';
      ctx.fillText('A', 230, 1330);
      ctx.fillText('B', 220, 1495);
      ctx.fillText('C', 475, 1485);
      ctx.fillText('θ', 425, 1458);

      ctx.fillStyle = '#1e40af';
      ctx.font = '18px sans-serif';
      ctx.fillText('a = 3 cm', 165, 1410); // perpendicular
      ctx.fillText('b = 4 cm', 330, 1500); // base
      ctx.fillText('c = 5 cm (hypotenuse)', 340, 1390); // hypotenuse
      ctx.restore();

      // FIGURE 2: Circle with Tangent PT
      ctx.save();
      ctx.strokeStyle = '#c7d2fe';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.fillRect(620, 1260, 480, 260);
      ctx.strokeRect(620, 1260, 480, 260);

      ctx.fillStyle = '#4338ca';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('Fig 2: Circle with Tangent PT at T', 640, 1290);

      // Circle Center O(760, 1400), radius 65
      const ox = 760;
      const oy = 1400;
      const radius = 65;
      ctx.beginPath();
      ctx.arc(ox, oy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fill();
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Center point O
      ctx.beginPath();
      ctx.arc(ox, oy, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#047857';
      ctx.fill();

      // Tangent point T at top of circle (760, 1335)
      const tx = 760;
      const ty = 1335;
      // External point P(1000, 1335)
      const px = 1000;
      const py = 1335;

      // Tangent line PT
      ctx.beginPath();
      ctx.moveTo(680, ty);
      ctx.lineTo(px + 40, ty);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Radius OT
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Line OP
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(ox, oy);
      ctx.lineTo(px, py);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // Right angle marker at T
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.strokeRect(tx, ty, 16, 16);

      // Labels
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px "Cambria Math", serif';
      ctx.fillText('O (Center)', ox - 35, oy + 25);
      ctx.fillText('T', tx - 15, ty - 10);
      ctx.fillText('P', px + 10, py - 10);
      ctx.fillStyle = '#047857';
      ctx.font = '16px sans-serif';
      ctx.fillText('r = 5 cm', ox - 70, oy - 25);
      ctx.fillStyle = '#dc2626';
      ctx.fillText('Tangent Line', 840, ty - 12);
      ctx.restore();
    } else if (type === 'handwriting') {
      // 1. Messy Handwritten Medical Prescription / Note
      // Off-white/cream paper texture
      ctx.fillStyle = '#fbf7ee';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle ruled lines
      ctx.strokeStyle = '#e2ded5';
      ctx.lineWidth = 1;
      for (let y = 140; y < canvas.height - 100; y += 42) {
        ctx.beginPath();
        ctx.moveTo(80, y);
        ctx.lineTo(canvas.width - 80, y);
        ctx.stroke();
      }

      // Clinic Header (Printed)
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 36px serif';
      ctx.fillText('CITY CARE CLINIC & RESEARCH CENTRE', 120, 90);
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Dr. R. K. Sharma, MD (Med) | Reg. No: 48291/DL', 120, 125);
      ctx.fillText('Patient: Rahul Verma | Age: 34 | Date: 12/09/2026', 120, 155);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(100, 180);
      ctx.lineTo(canvas.width - 100, 180);
      ctx.stroke();

      // Rx Symbol
      ctx.fillStyle = '#0f172a';
      ctx.font = 'italic bold 52px serif';
      ctx.fillText('Rx', 110, 250);

      // Messy cursive handwriting simulation with varied pressure & slant
      const handwrittenLines = [
        { text: 'Tab. Amoxyclav 625mg  --- 1 tab TDS x 5 days (After food)', y: 310, angle: -0.02 },
        { text: 'Tab. Pantocid 40mg  --- 1 tab OD empty stomach (सुबह खाली पेट)', y: 380, angle: 0.01 },
        { text: 'Syp. Grilinctus-BM  --- 2 tsp BD x 7 days for dry cough', y: 460, angle: -0.015 },
        { text: 'Tab. Dolo 650mg  --- SOS for fever > 100°F (बुखार होने पर)', y: 540, angle: 0.02 },
        { text: 'Adv: Complete Bed Rest, steam inhalation 3 times daily', y: 640, angle: -0.01 },
        { text: 'Lab Tests Advised:', y: 720, angle: 0.0 },
        { text: '  1. CBC with ESR & Platelet Count', y: 780, angle: -0.02 },
        { text: '  2. Serum Creatinine & LFT profile', y: 840, angle: 0.01 },
        { text: '  3. Chest X-Ray (PA View) if cough persists > 3 days', y: 900, angle: -0.015 },
        { text: 'Follow up in OPD after 5 days with test reports.', y: 1000, angle: 0.01 },
      ];

      ctx.fillStyle = '#1e3a8a'; // Blue ink pen
      for (const item of handwrittenLines) {
        ctx.save();
        ctx.translate(130, item.y);
        ctx.rotate(item.angle);
        ctx.font = 'italic 34px "Segoe Script", "Comic Sans MS", cursive, sans-serif';
        ctx.fillText(item.text, 0, 0);
        ctx.restore();
      }

      // Doctor signature
      ctx.save();
      ctx.translate(800, 1250);
      ctx.rotate(-0.08);
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(40, -50, 100, 30, 160, -20);
      ctx.bezierCurveTo(200, -60, 240, 40, 300, -10);
      ctx.stroke();
      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Dr. R. K. Sharma', 50, 40);
      ctx.restore();

      // Clinic Stamp
      ctx.save();
      ctx.translate(180, 1200);
      ctx.rotate(-0.06);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, 260, 110);
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#dc2626';
      ctx.fillText('CITY CARE CLINIC', 25, 45);
      ctx.font = '18px sans-serif';
      ctx.fillText('VERIFIED & STAMPED', 30, 80);
      ctx.restore();
    } else if (type === 'poor-lighting') {
      // 2. Poor lighting document with heavy shadow gradient & vignette
      // Base paper
      ctx.fillStyle = '#e8e4dc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add realistic dark diagonal shadow across paper (uneven phone camera shadow)
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, 'rgba(30, 25, 20, 0.45)');
      grad.addColorStop(0.5, 'rgba(80, 75, 70, 0.15)');
      grad.addColorStop(1, 'rgba(255, 255, 240, 0.25)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Vignette shadow
      const radial = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        400,
        canvas.width / 2,
        canvas.height / 2,
        900
      );
      radial.addColorStop(0, 'rgba(0,0,0,0)');
      radial.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Handwritten and printed mix with varied contrast
      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('HANDWRITTEN INSPECTION REPORT', 120, 120);

      ctx.font = 'italic 30px cursive, sans-serif';
      ctx.fillStyle = '#292524';
      ctx.fillText('Site Location: Sector 62, Industrial Area, Noida', 120, 220);
      ctx.fillText('Inspected by: Er. Vikash Tiwari (Senior Engineer)', 120, 280);
      ctx.fillText('Status: Approved with pending observations on wiring', 120, 340);
      ctx.fillText('Meter Reading: 45,892.4 kWh | Phase 3 Balanced', 120, 400);
      ctx.fillText('Voltage Check: L1=232V, L2=235V, L3=230V, Freq=50.1Hz', 120, 460);
      ctx.fillText('Remark: Earthing resistance measured at 1.8 Ohms (Within Safe Limit).', 120, 520);
      ctx.fillText('Contractor Note: "Final NOC will be released upon panel sealing."', 120, 600);
      ctx.fillText('Signature: V. Tiwari, 14-Sep-2026', 120, 700);
    } else {
      // 3. Complex Printed Invoice with Multi-column Tables
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top bar
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(80, 60, canvas.width - 160, 8);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText('TAX INVOICE', 80, 130);

      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Invoice No: INV-2026-9481', 80, 175);
      ctx.fillText('Date: 14 September 2026', 80, 205);
      ctx.fillText('GSTIN: 07AABCS1429B1Z8', 80, 235);

      ctx.textAlign = 'right';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('VERTEX ENTERPRISES PVT. LTD.', canvas.width - 80, 130);
      ctx.font = '19px sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Connaught Place, New Delhi - 110001', canvas.width - 80, 165);
      ctx.fillText('support@vertexenterprises.in', canvas.width - 80, 195);
      ctx.textAlign = 'left';

      // Table header
      const tableY = 320;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(80, tableY, canvas.width - 160, 50);

      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(80, tableY, canvas.width - 160, 50);

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('Item Description', 100, tableY + 32);
      ctx.fillText('HSN Code', 520, tableY + 32);
      ctx.fillText('Qty', 680, tableY + 32);
      ctx.fillText('Unit Rate (₹)', 800, tableY + 32);
      ctx.fillText('Amount (₹)', 980, tableY + 32);

      // Table rows
      const items = [
        { desc: 'AI Document Scanner Pro License (Annual)', hsn: '998314', qty: '1', rate: '24,999.00', amt: '24,999.00' },
        { desc: 'Cloud OCR API Credits (100,000 pages)', hsn: '998313', qty: '2', rate: '7,500.00', amt: '15,000.00' },
        { desc: 'Hardware Calibration & Onsite Setup', hsn: '998719', qty: '1', rate: '4,500.00', amt: '4,500.00' },
        { desc: 'Extended 24/7 Enterprise Support SLA', hsn: '998319', qty: '1', rate: '8,000.00', amt: '8,000.00' },
      ];

      let rowY = tableY + 50;
      ctx.font = '20px sans-serif';
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        ctx.fillRect(80, rowY, canvas.width - 160, 50);
        ctx.strokeRect(80, rowY, canvas.width - 160, 50);

        ctx.fillStyle = '#334155';
        ctx.fillText(item.desc, 100, rowY + 32);
        ctx.fillText(item.hsn, 520, rowY + 32);
        ctx.fillText(item.qty, 680, rowY + 32);
        ctx.fillText(item.rate, 800, rowY + 32);
        ctx.fillText(item.amt, 980, rowY + 32);
        rowY += 50;
      }

      // Totals
      rowY += 20;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(650, rowY, canvas.width - 160 - 570, 160);
      ctx.strokeRect(650, rowY, canvas.width - 160 - 570, 160);

      ctx.fillStyle = '#475569';
      ctx.font = '20px sans-serif';
      ctx.fillText('Subtotal:', 680, rowY + 35);
      ctx.fillText('₹ 52,499.00', 940, rowY + 35);

      ctx.fillText('CGST (9%):', 680, rowY + 70);
      ctx.fillText('₹ 4,724.91', 940, rowY + 70);

      ctx.fillText('SGST (9%):', 680, rowY + 105);
      ctx.fillText('₹ 4,724.91', 940, rowY + 105);

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('Grand Total:', 680, rowY + 145);
      ctx.fillText('₹ 61,948.82', 940, rowY + 145);
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const fileNames = {
        'math-formulas': 'sample_higher_math_formulas_assignment.png',
        handwriting: 'sample_messy_doctor_prescription.png',
        'poor-lighting': 'sample_poor_lighting_inspection_notes.png',
        'invoice-table': 'sample_official_tax_invoice_table.png',
      };
      const file = new File([blob], fileNames[type], { type: 'image/png' });
      resolve(file);
    }, 'image/png');
  });
}
