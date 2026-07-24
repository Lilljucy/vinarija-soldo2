Ovamo stavi .glb datoteke 3D modela boca za "Vinoteka" sekciju na vina.html.

Kod u vina.html trenutno očekuje točno ove nazive datoteka:

  3d/grasevina.glb      (Graševina, bijelo vino)
  3d/vetovo-cuvee.glb   (Vetovo Cuvee, crno vino)
  3d/rose.glb           (Rosé)

Ako koristiš druge nazive, uskladi ih u atributu src <model-viewer> elementa
u vina.html (sekcija id="vinoteka").

Preporuke za same modele:
- format: .glb (binarni glTF, samostalan fajl sa svim teksturama)
- veličina do ~10-15 MB po modelu radi brzog učitavanja
- boca centrirana i skalirana tako da stane u odgovarajući "camera-orbit"
