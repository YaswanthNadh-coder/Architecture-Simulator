import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSimulatorStore } from '../store/simulatorStore';
const REGISTERS = [
  'zero', 'at', 'v0', 'v1', 'a0', 'a1', 'a2', 'a3',
  't0', 't1', 't2', 't3', 't4', 't5', 't6', 't7',
  's0', 's1', 's2', 's3', 's4', 's5', 's6', 's7',
  't8', 't9', 'k0', 'k1', 'gp', 'sp', 'fp', 'ra'
];

export function getRegisterName(index: number): string {
  return REGISTERS[index] || `${index}`;
}

export const generateReport = () => {
  const store = useSimulatorStore.getState();
  const engine = store.getEngine();
  const snapshot = engine.getSnapshot();
  const stats = store.stats;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Title
  doc.setFontSize(20);
  doc.text('MIPS Architecture Simulator Report', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

  // 1. Overall Statistics
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('1. Execution Statistics', 14, 45);

  autoTable(doc, {
    startY: 50,
    head: [['Metric', 'Value']],
    body: [
      ['Total Cycles', stats.totalCycles.toString()],
      ['Instructions Completed', stats.instructionsCompleted.toString()],
      ['CPI (Cycles Per Instruction)', stats.cpi.toString()],
      ['Stall Cycles', stats.stallCycles.toString()],
      ['Data Forwards', stats.forwardCount.toString()],
      ['Branch Mispredictions', stats.branchMispredictions.toString()],
      ['Pipeline Flushes', stats.flushCount.toString()],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });

  // 2. CPU Architecture Configuration
  const finalYStats = (doc as any).lastAutoTable.finalY || 50;
  
  doc.setFontSize(14);
  doc.text('2. CPU Architecture Settings', 14, finalYStats + 15);

  autoTable(doc, {
    startY: finalYStats + 20,
    head: [['Setting', 'Configuration']],
    body: [
      ['Data Forwarding', store.forwardingEnabled ? 'Enabled' : 'Disabled'],
      ['Branch Prediction', store.branchPrediction === 'always-taken' ? 'Always Taken' : 'Assume Not Taken'],
      ['Memory Latency', `${store.memoryLatency} cycles`],
      ['Cache Hierarchy (L1/L2/L3)', store.cacheConfig.enabled ? 'Enabled' : 'Disabled'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [46, 204, 113] },
  });

  // 3. Cache Statistics (if enabled)
  let nextSectionY = (doc as any).lastAutoTable.finalY + 15;
  
  if (store.cacheConfig.enabled) {
    const hierarchy = engine.cacheHierarchy;
    const l1Stats = hierarchy.l1.stats;
    const l1HitRate = l1Stats.accesses > 0 ? ((l1Stats.hits / l1Stats.accesses) * 100).toFixed(1) : '0.0';
    const amat = hierarchy.getAMAT().toFixed(2);
    
    doc.setFontSize(14);
    doc.text('3. Cache Hierarchy Statistics', 14, nextSectionY);

    const cacheTableRows = [
      ['AMAT (Average Access Time)', `${amat} cycles`],
      ['L1 Cache Status', `Enabled (${store.cacheHierarchyConfig.l1.cacheSize}B, ${store.cacheHierarchyConfig.l1.associativity}-way)`],
      ['L1 Accesses / Hits / Misses', `${l1Stats.accesses} / ${l1Stats.hits} / ${l1Stats.misses} (${l1HitRate}% Hit)`],
    ];

    if (store.cacheHierarchyConfig.l2.enabled) {
      const l2Stats = hierarchy.l2.stats;
      const l2HitRate = l2Stats.accesses > 0 ? ((l2Stats.hits / l2Stats.accesses) * 100).toFixed(1) : '0.0';
      cacheTableRows.push(
        ['L2 Cache Status', `Enabled (${store.cacheHierarchyConfig.l2.cacheSize}B, ${store.cacheHierarchyConfig.l2.associativity}-way)`],
        ['L2 Accesses / Hits / Misses', `${l2Stats.accesses} / ${l2Stats.hits} / ${l2Stats.misses} (${l2HitRate}% Hit)`]
      );
    } else {
      cacheTableRows.push(['L2 Cache Status', 'Disabled (Bypassed)']);
    }

    if (store.cacheHierarchyConfig.l3.enabled) {
      const l3Stats = hierarchy.l3.stats;
      const l3HitRate = l3Stats.accesses > 0 ? ((l3Stats.hits / l3Stats.accesses) * 100).toFixed(1) : '0.0';
      cacheTableRows.push(
        ['L3 Cache Status', `Enabled (${store.cacheHierarchyConfig.l3.cacheSize}B, ${store.cacheHierarchyConfig.l3.associativity}-way)`],
        ['L3 Accesses / Hits / Misses', `${l3Stats.accesses} / ${l3Stats.hits} / ${l3Stats.misses} (${l3HitRate}% Hit)`]
      );
    } else {
      cacheTableRows.push(['L3 Cache Status', 'Disabled (Bypassed)']);
    }

    autoTable(doc, {
      startY: nextSectionY + 5,
      head: [['Metric', 'Value']],
      body: cacheTableRows,
      theme: 'grid',
      headStyles: { fillColor: [155, 89, 182] },
    });
    
    nextSectionY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 4. Final Register State
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Final Register State', 14, 20);

  const regBody = [];
  for (let i = 0; i < 32; i++) {
    const val = snapshot.registers[i];
    if (val !== 0 || i === 28 || i === 29) { // Only show non-zero, plus gp and sp
      regBody.push([`$${i} (${getRegisterName(i)})`, val.toString(), `0x${(val >>> 0).toString(16).padStart(8, '0').toUpperCase()}`]);
    }
  }

  autoTable(doc, {
    startY: 25,
    head: [['Register', 'Decimal', 'Hexadecimal']],
    body: regBody,
    theme: 'striped',
    headStyles: { fillColor: [52, 73, 94] },
  });

  // 5. Source Code
  doc.addPage();
  doc.setFontSize(14);
  doc.text('MIPS Assembly Source Code', 14, 20);

  const codeLines = store.code.split('\n');
  const codeBody = codeLines.map((line, index) => [(index + 1).toString(), line]);

  autoTable(doc, {
    startY: 25,
    head: [['Line', 'Code']],
    body: codeBody,
    theme: 'plain',
    styles: { font: 'courier', fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 15, textColor: [150, 150, 150] },
      1: { cellWidth: 'auto' },
    },
  });

  // Save the PDF
  doc.save('MIPS_Simulator_Report.pdf');
};
