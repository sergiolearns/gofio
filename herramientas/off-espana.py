# Filtra el volcado CSV de Open Food Facts (ODbL) y deja lo que se vende en España con sus cuatro números por 100 g.
# Uso: python3 off-espana.py en.openfoodfacts.org.products.csv.gz super.json
import csv, gzip, json, re, sys, unicodedata, datetime
csv.field_size_limit(10**9)
ent, sal = sys.argv[1], sys.argv[2]
def norm(s): return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')
R=[(r'huevo','huevo'),(r'patatas? fritas|chips|papas fritas','papa-bolsa'),(r'tortilla de patata','huevo-revuelto'),(r'^(pollo|pechuga|muslo|contramuslo|pavo)','pollo-bandeja'),
 (r'^arroz|arroz ','arroz'),(r'garbanzo|lenteja|alubia|judia|frijol|habas?\b','legumbres'),(r'pasta|macarr|espagu|fideo|tallarin|lasana|ravioli|tortellini','pasta'),
 (r'tomate','tomate'),(r'^leche|bebida (de|vegetal)','leche'),(r'yogur|kefir|skyr','yogur'),(r'queso','queso'),(r'aceite|mantequilla|margarina','aceite'),(r'cafe','cafe'),
 (r'galleta|bizcocho|magdalena|croissant|donut|cookie|ambrosia|barquillo|napolitana|palmera','galleta'),(r'^pan |^pan$|pan de molde|tostada|biscote|bollo|baguette','pan'),
 (r'cereal|avena|muesli|copos|granola|gofio','cuenco'),(r'atun|salmon|merluza|bacalao|sardina|caballa|anchoa|gamba|langostino|calamar|pulpo|mejillon|surimi|pescado','pescado'),
 (r'jamon|chorizo|salchich|bacon|beicon|salami|mortadela|fuet|lomo embuchado|pavo en lonchas|fiambre','carne-cerdo'),(r'ternera|vacuno|hamburguesa|carne','carne'),
 (r'zumo|nectar|jugo','zumo'),(r'refresco|cola|gaseosa|tonica|cerveza|bebida','refresco'),(r'chocolate|bombon|caramelo|gominola|turron|mermelada|miel|helado|natillas|flan|crema de cacao','dulce'),
 (r'almendra|nuez|nueces|cacahuete|avellana|pistacho|anacardo|frutos secos|pipas','frutos-secos'),(r'manzana|pera|platano|fresa|melocoton|pina|mango|fruta','fruta'),
 (r'ensalada|lechuga|espinaca|brocoli|verdura|gazpacho|salmorejo|pimiento|zanahoria|cebolla|champinon','verdura'),(r'pizza|empanada|croqueta|plato preparado|cocido|paella|potaje|fabada|guiso','cuenco')]
def dib(n):
    x = norm(n)
    for p, d in R:
        if re.search(p, x): return d
    return ''
def f(v):
    try:
        x = float(v)
        return x if x == x else None
    except: return None
marcas, idx, out, vistos = [], {}, [], set()
n = esp = 0
with gzip.open(ent, 'rt', encoding='utf-8', errors='replace', newline='') as fh:
    rd = csv.reader(fh, delimiter='\t', quoting=csv.QUOTE_NONE)
    cab = next(rd); C = {k: i for i, k in enumerate(cab)}
    need = ['code','product_name','brands','countries_tags','energy-kcal_100g','energy-kj_100g','energy_100g','proteins_100g','carbohydrates_100g','fat_100g','unique_scans_n','popularity_key']
    falta = [k for k in need if k not in C]
    if falta: print('faltan columnas', falta)
    g = lambda row, k: row[C[k]] if k in C and C[k] < len(row) else ''
    for row in rd:
        n += 1
        if n % 500000 == 0: print(n, esp, len(out), flush=True)
        if 'en:spain' not in g(row, 'countries_tags'): continue
        esp += 1
        code = g(row, 'code').strip(); nom = re.sub(r'\s+', ' ', g(row, 'product_name')).strip()
        if not code or not nom or code in vistos: continue
        kcal = f(g(row, 'energy-kcal_100g'))
        if kcal is None:
            kj = f(g(row, 'energy-kj_100g')) or f(g(row, 'energy_100g'))
            kcal = kj / 4.184 if kj is not None else None
        p, c, gr = f(g(row, 'proteins_100g')), f(g(row, 'carbohydrates_100g')), f(g(row, 'fat_100g'))
        if kcal is None or p is None or c is None or gr is None: continue
        # Lo imposible fuera: más de 900 kcal o más de 100 g por 100 g, o la energía muy lejos de sus macros.
        if not (0 <= kcal <= 902 and 0 <= p <= 100 and 0 <= c <= 100 and 0 <= gr <= 100 and p + c + gr <= 105): continue
        est = 4 * p + 4 * c + 9 * gr
        if abs(kcal - est) > max(60, 0.35 * max(kcal, est)): continue
        vistos.add(code)
        m = (g(row, 'brands').split(',')[0].strip())[:40]
        if m:
            if m not in idx: idx[m] = len(marcas); marcas.append(m)
            mi = idx[m]
        else: mi = -1
        pop = int(f(g(row, 'unique_scans_n')) or 0)
        out.append([code, nom[:80], mi, round(kcal), round(p, 1), round(c, 1), round(gr, 1), dib(nom), pop])
out.sort(key=lambda x: -x[8])
json.dump({'fecha': datetime.date.today().isoformat(), 'fuente': 'Open Food Facts (world.openfoodfacts.org), productos vendidos en España. Licencia ODbL (base de datos) y DbCL (contenidos).',
           'campos': ['código','nombre','marca (índice)','kcal','proteína g','hidratos g','grasa g','dibujo','escaneos'], 'marcas': marcas, 'productos': out},
          open(sal, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('filas', n, 'españa', esp, 'guardados', len(out), 'marcas', len(marcas))
