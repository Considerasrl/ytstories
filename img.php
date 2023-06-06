<?php
	// URL dell'immagine da scaricare e ridimensionare
	$v = $_GET['v'];
	$image_url = "https://img.youtube.com/vi/" . $v . "/sddefault.jpg";

	// Scarica l'immagine
	$image_contents = file_get_contents($image_url);

	// Crea un'immagine da una stringa di byte
	$image = imagecreatefromstring($image_contents);

	// Ottieni le dimensioni dell'immagine originale
	$original_width = imagesx($image);
	$original_height = imagesy($image);

	// Calcola l'altezza desiderata per l'immagine crop
	$desired_height = $original_width * 9 / 16;

	// Se l'altezza desiderata è maggiore dell'altezza originale,
	// ridimensiona l'immagine in modo che l'altezza sia uguale all'altezza desiderata
	if ($desired_height > $original_height) {
		$resized_image = imagescale($image, $original_width * $desired_height / $original_height, $desired_height);
		imagedestroy($image);
		$image = $resized_image;
		$original_width = imagesx($image);
		$original_height = imagesy($image);
	}

	// Calcola la posizione del crop
	$left = max(0, ($original_width - 640) / 2);
	$top = max(0, ($original_height - $desired_height) / 2);

	// Esegue il crop
	$cropped_image = imagecrop($image, [
		'x' => $left,
		'y' => $top,
		'width' => 640,
		'height' => $desired_height
	]);

	// Imposta l'header della risposta come immagine JPEG
	header('Content-Type: image/jpeg');

	// Restituisce l'immagine
	imagejpeg($cropped_image);

	// Libera la memoria dalle immagini
	imagedestroy($image);
	imagedestroy($cropped_image);