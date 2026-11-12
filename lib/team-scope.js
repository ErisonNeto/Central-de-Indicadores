// Exclude Middle Mile assignments before aggregation, not just from S/C labels.
// Callers supply only fixed, source-controlled SQL column identifiers.
export function teamScope(...columns) {
 if(!columns.length||columns.some(c=>!/^([a-z_]+\.)?[a-z_]+$/.test(c)))throw new Error('Coluna de responsável inválida');
 return columns.map(c=>`UPPER(TRIM(REGEXP_REPLACE(COALESCE(${c},''), '[[:space:]]+', ' ', 'g'))) <> 'DARLEY WALLACE CUNHA QUARESMA'`).join(' AND ');
}
