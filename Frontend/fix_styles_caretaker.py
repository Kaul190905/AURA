import re

def main():
    file_path = 'src/screens/CaretakerDashboardScreen.tsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements
    replacements = [
        ("style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, padding: 8, backgroundColor: darkMode ? '#333' : '#f8f9fa', borderRadius: 8 }}", 
         "style={[styles.sensorRow, darkMode ? styles.bgDark333 : styles.bgLightF8]}"),
        ("style={{ alignItems: 'center' }}", "style={styles.alignCenter}"),
        ("style={[subTextStyle, { fontSize: 10, ...fonts.bold }]}", "style={[subTextStyle, styles.font10Bold]}"),
        ("style={[textStyle, { fontSize: 13, ...fonts.bold, color: bpm > 100 ? colors.riskHigh : textStyle.color }]}", 
         "style={[textStyle, styles.font13Bold, bpm > 100 ? styles.colorRiskHigh : undefined]}"),
        ("style={[textStyle, { fontSize: 13, ...fonts.bold }]}", "style={[textStyle, styles.font13Bold]}"),
        ("style={[textStyle, { fontSize: 13, ...fonts.bold, color: soundLevel > 70 ? colors.riskMed : textStyle.color }]}", 
         "style={[textStyle, styles.font13Bold, soundLevel > 70 ? styles.colorRiskMed : undefined]}"),
        ("style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}", "style={styles.headerTop}"),
        ("style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}", "style={styles.headerStatus}"),
        ("style={{ flex: 1 }}", "style={styles.flex1}"),
        ("style={{ marginVertical: 4 }}", "style={styles.marginV4}"),
        ("style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}", "style={styles.criticalHeaderLeft}"),
        ("style={[styles.sectionTitle, { color: colors.riskHigh, marginBottom: 0 }]}", "style={[styles.sectionTitle, styles.criticalTitle]}"),
        ("style={[styles.alertInfo, { borderBottomColor: darkMode ? '#333' : '#f0f0f0' }]}", "style={[styles.alertInfo, darkMode ? styles.borderDark333 : styles.borderLightF0]}"),
        ("style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}", "style={styles.rowBetweenCenter}"),
        ("style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 4 }}", "style={styles.alertLocationRow}"),
        ("style={[styles.alertLocation, textStyle, { fontWeight: 'bold' }]}", "style={[styles.alertLocation, textStyle, styles.fontWeightBold]}"),
        ("style={[styles.viewAllBtn, { borderTopColor: darkMode ? '#333' : '#f0f0f0' }]}", "style={[styles.viewAllBtn, darkMode ? styles.borderTopDark333 : styles.borderTopLightF0]}")
    ]

    for old, new in replacements:
        content = content.replace(old, new)

    styles_to_add = """
  sensorRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, padding: 8, borderRadius: 8 },
  bgDark333: { backgroundColor: '#333' },
  bgLightF8: { backgroundColor: '#f8f9fa' },
  alignCenter: { alignItems: 'center' },
  font10Bold: { fontSize: 10, ...fonts.bold },
  font13Bold: { fontSize: 13, ...fonts.bold },
  colorRiskHigh: { color: colors.riskHigh },
  colorRiskMed: { color: colors.riskMed },
  headerTop: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex1: { flex: 1 },
  marginV4: { marginVertical: 4 },
  criticalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  criticalTitle: { color: colors.riskHigh, marginBottom: 0 },
  borderDark333: { borderBottomColor: '#333' },
  borderLightF0: { borderBottomColor: '#f0f0f0' },
  borderTopDark333: { borderTopColor: '#333' },
  borderTopLightF0: { borderTopColor: '#f0f0f0' },
  rowBetweenCenter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertLocationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 4 },
  fontWeightBold: { fontWeight: 'bold' },
"""
    
    # insert before the closing bracket of StyleSheet.create
    # find last '});'
    pos = content.rfind('});')
    if pos != -1:
        content = content[:pos] + styles_to_add + content[pos:]

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Replacements done.")

if __name__ == '__main__':
    main()
