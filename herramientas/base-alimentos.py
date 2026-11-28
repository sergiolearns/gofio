# Monta datos/alimentos.json (R31): BEDCA + la selección de la TCAC + USDA, con el dibujo y el tamaño de cada alimento.
import json, re, unicodedata
SRC='investigacion/'  # carpeta con los JSON de BEDCA y USDA (12-gofio/investigacion)
bed=json.load(open(SRC+'gofio-bedca.json')); por=json.load(open(SRC+'gofio-usda-porciones.json')); nut=json.load(open(SRC+'gofio-usda-nutrientes.json'))['por100g']; tc=json.load(open('investigacion/gofio-tcac.json'))
def norm(s): return ''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
R=[ # (regex, dibujo) en orden
 (r'^huevo.*frito','huevo-frito'),(r'^huevo.*(hervido|duro|pasado|escalfado|cocido)','huevo-cocido'),(r'^huevo.*revuelto|tortilla','huevo-revuelto'),(r'^huevo','huevo'),
 (r'patacon','patacon'),(r'(patata|papa).*(chips|prefrita|congelad)','papa-bolsa'),(r'(patata|papa).*frit','papa-frita'),(r'(patata|papa).*(asad|arrugad|salteada)','papa-arrugada'),(r'(patata|papa).*(hervid|cocid)','papa-cocida'),(r'^(patata|papa)\b','papa'),(r'^pure.*patata','papa-cocida'),
 (r'^(pollo|pavo|gallina|contramuslo|muslo de pollo|pechuga)','POLLO'),
 (r'arepa|almojabana|pandebono|envuelto','arepa'),(r'platano|banano|banana','platano'),
 (r'^arroz(?!.*leche)','arroz'),(r'garbanzo|lenteja|judia(?! verde)|frijol|alubia|guisante|haba|soja|arveja','legumbres'),(r'^pasta alim|macarr|espagu|fideo|tallarin','pasta'),
 (r'^tomate','tomate'),(r'^leche(?! condensada)|bebida de|^nata|batido','leche'),(r'^yogur|kumis|kefir','yogur'),(r'^queso|cuajada|requeson','queso'),(r'^aceite|mantequilla|margarina|manteca','aceite'),
 (r'^cafe|^te[ ,]|infusion','cafe'),(r'galleta|bizcocho|magdalena|croissant|pastel|tarta|brownie|ponque|roscon|donut|bolleria|ensaimada|churro','galleta'),
 (r'^pan[ ,]|^pan$|tostada|biscote|baguette|pan de yuca|pan de queso|^bollo','pan'),(r'^gofio|avena|cereal|copos|muesli|harina','cuenco'),
 (r'atun|salmon|merluza|bacalao|sardina|pescad|trucha|lubina|dorada|boquer|caballa|mero|cherne|vieja|lenguado|rape|bonito|anchoa|gamba|langostino|calamar|pulpo|mejillon|almeja|marisco|anguila|carpa|lucio|perca|platija|tenca|cabracho|ostra|bigaro|angula|cangrejo|chirla|faneca|panga|pijota|sargo|zamburi|berberecho|caviar|navaja|sepia|chipiron','pescado'),
 (r'^cerdo|jamon|chorizo|salchich|bacon|beicon|lomo embuchado|morcilla|salami|mortadela|panceta|sobrasada|butifarra|choped|lacon|tocino|de cerdo','carne-cerdo'),(r'ternera|vaca|buey|cordero|cabrito|conejo|carne|hamburguesa|chuleta|filete|higado|^res','carne'),
 (r'^(naranja|mandarina|limon|pomelo|lima)','naranja'),(r'^(manzana|pera|fresa|uva|melon|sandia|pina|mango|papaya|guayaba|kiwi|melocoton|cereza|ciruela|higo|nispero|frambuesa|mora|arandano|granada|albaricoque|chirimoya|maracuya|lulo|guanabana|fruta)','fruta'),
 (r'^(zumo|jugo|nectar)','zumo'),(r'refresco|cola|gaseosa|bebida|cerveza|vino|sidra','refresco'),
 (r'chocolate|bombon|caramelo|turron|bocadillo|arequipe|dulce|mermelada|^miel|azucar|panela|helado|natillas|flan|cuajada de|gelatina|crema catalana|manjar','dulce'),
 (r'almendra|nuez|nueces|cacahuete|avellana|pistacho|^mani|pipa|anacardo|piñon|pinon','frutos-secos'),
 (r'lechuga|espinaca|acelga|^col|brocoli|judia verde|calabac|pepino|pimiento|pimenton|cebolla|zanahoria|berenjena|verdura|ensalada|ahuyama|calabaza|arracacha|yuca|esparrago|alcachofa|apio|puerro|ajo|champi|seta|remolacha|rabano|nabo|coliflor|berro|batata|boniato|aguacate|aceituna|okra|palmito','verdura'),
]
def dib(nombre):
  n=norm(nombre)
  for pat,d in R:
    if re.search(pat,n):
      if d=='POLLO':
        if re.search(r'frit|empanad|rebozad|nugget',n): return 'pollo-frito'
        if re.search(r'asad|plancha|horno|parrilla',n): return 'pollo-asado'
        if re.search(r'caldo|cocid|hervid|guis|estofad',n): return 'pollo-cocido'
        if re.search(r'fiambre|embutido',n): return 'pollo-bandeja'
        return 'pollo'
      return d
  return 'cuenco'
TAM={ # USDA SR Legacy (gramos de la parte comestible)
 'papa':{'p':170,'m':213,'g':369,'u':'papa'},'huevo':{'p':38,'m':44,'g':50,'u':'huevo'},'muslo':{'una':130,'u':'muslo'},'contramuslo':{'una':193,'u':'contramuslo'},'pechuga':{'una':145,'u':'pechuga'},
 'platano':{'p':101,'m':118,'g':136,'u':'plátano'},'platanoMacho':{'una':270,'u':'plátano macho'},'platanoVerde':{'una':267,'u':'plátano verde'},'manzana':{'p':149,'m':182,'g':223,'u':'manzana'},
 'naranja':{'p':96,'m':131,'g':184,'u':'naranja'},'tomate':{'p':91,'m':123,'g':182,'u':'tomate'},'cebolla':{'p':70,'m':110,'g':150,'u':'cebolla'},'zanahoria':{'p':50,'m':61,'g':72,'u':'zanahoria'},
 'aguacate':{'una':201,'u':'aguacate'},'batata':{'una':130,'u':'batata'},'pimiento':{'p':74,'m':119,'g':164,'u':'pimiento'},'pepino':{'una':301,'u':'pepino'},'limon':{'una':58,'u':'limón'},
 'mandarina':{'p':76,'m':88,'g':120,'u':'mandarina'},'pera':{'p':148,'m':178,'g':230,'u':'pera'},'kiwi':{'una':69,'u':'kiwi'},'calabacin':{'p':118,'m':196,'g':323,'u':'calabacín'},
 'pan':{'p':20,'m':25,'g':30,'u':'rebanada','tallas':['fina','normal','gruesa']},'mango':{'una':336,'u':'mango'},'yuca':{'una':408,'u':'yuca'}}
TREG=[(r'^patata, (cruda|hervida|asada)|^papa pastusa','papa'),(r'^huevo de gallina, (frito|hervido|escalfado|pasado)|^huevo de gallina fresco','huevo'),(r'^pollo, muslo','muslo'),(r'^pollo, pechuga','pechuga'),
 (r'^platano$','platano'),(r'platano harton maduro','platanoMacho'),(r'platano harton verde, (crudo|cocido)','platanoVerde'),(r'^manzana$','manzana'),(r'^naranja$','naranja'),(r'^tomate$|^tomate, crudo','tomate'),
 (r'^cebolla$|^cebolla, cruda','cebolla'),(r'^zanahoria$|^zanahoria, cruda','zanahoria'),(r'^aguacate$','aguacate'),(r'^pera$','pera'),(r'^kiwi$','kiwi'),(r'^mandarina$','mandarina'),(r'^mango$','mango'),(r'^pepino$','pepino'),
 (r'^pimiento (verde|rojo)$','pimiento'),(r'^calabacin$','calabacin'),(r'^limon$','limon'),(r'^yuca blanca, sin cascara, (cruda|cocida)','yuca'),(r'^(boniato|batata)','batata'),(r'de molde','pan')]
def tam(nombre):
  n=norm(nombre)
  for pat,k in TREG:
    if re.search(pat,n): return k
  return None
out=[]; ya=set()
for g,fid,nom,kcal,p,hc,gr,fi,pc in bed['alimentos']:
  if kcal is None: continue
  out.append(['b'+str(fid),nom,kcal,round(p or 0,1),round(hc or 0,1),round(gr or 0,1),'b',dib(nom),tam(nom)]); ya.add(norm(nom))
for cod,nom,kcal,p,hc,gr,fi in tc['alimentos']:
  out.append(['t'+cod,nom,kcal,p,hc,gr,'t',dib(nom),tam(nom)])
ES={'pan':'Pan de molde blanco','contramuslo':'Pollo, contramuslo, con piel, crudo','batata':'Batata, cruda','kiwi':'Kiwi','mango':'Mango','calabacin':'Calabacín, crudo','pimiento':'Pimiento verde, crudo','pepino':'Pepino, con piel, crudo','mandarina':'Mandarina','pera':'Pera','limon':'Limón, sin piel','platanoMacho':'Plátano macho maduro, crudo','platanoVerde':'Plátano macho verde, crudo','aguacate':'Aguacate','cebolla':'Cebolla, cruda','zanahoria':'Zanahoria, cruda','tomate':'Tomate, crudo','yuca':'Yuca, cruda'}
falta=[]
for k,nombre in ES.items():
  # solo si ninguna base trae ya ese alimento con su tamaño
  if k!='pan' and any(x[8]==k for x in out): continue
  v=por['alimentos'][k]; n=nut[str(v['fdc_id'])]
  out.append(['u'+str(v['fdc_id']),nombre,n['kcal'],round(n['prot'],1),round(max(0,n['hc']-n.get('fibra',0)),1),round(n['grasa'],1),'u',dib(nombre),k]); falta.append(k)
FU={'b':'AESAN/BEDCA, Base de Datos Española de Composición de Alimentos v1.0 (2010), www.bedca.net','t':'ICBF, Tabla de Composición de Alimentos Colombianos (TCAC 2018), www.icbf.gov.co','u':'USDA, Agricultural Research Service, FoodData Central, SR Legacy (2018), fdc.nal.usda.gov (dominio público)'}
json.dump({'nota':'Base de alimentos de Gofio (libro 1.6, R31). Por 100 g de porción comestible. Campos: id, nombre, kcal, proteína, hidratos disponibles, grasa, fuente, dibujo, tamaño.','fuentes':FU,'tamanos':TAM,'alimentos':out},open('datos/alimentos.json','w'),ensure_ascii=False,separators=(',',':'))
import collections
print(len(out),'usda:',falta); print(collections.Counter(x[7] for x in out).most_common()); print([x[1] for x in out if x[8]][:80])
