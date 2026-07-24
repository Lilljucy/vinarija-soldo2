Ovamo stavi .glb datoteke 3D modela boca za "Vinoteka" sekciju na vina.html.

Kod u vina.html trenutno očekuje točno ove nazive datoteka:

  3d/grasevina.glb      (Graševina, bijelo vino)
  3d/vetovo-cuvee.glb   (Vetovo Cuvee, crno vino)
  3d/rose.glb           (Rosé)

Ako koristiš druge nazive, uskladi ih u atributu src <model-viewer> elementa
u vina.html (sekcija id="vinoteka").

Preporuke za same modele:
- format: .glb (binarni glTF, samostalan fajl sa svim teksturama)
- veličina 2-3 MB po modelu (max) radi brzog učitavanja na mobitelu
  - ako je izvorni model veći, komprimiraj ga alatom gltf-transform ili
    gltfpack (Draco/Meshopt kompresija geometrije + smanjenje tekstura
    na max 1024-2048px, format WebP/JPEG umjesto PNG gdje je moguće)
- boca centrirana i skalirana tako da stane u odgovarajući "camera-orbit"
