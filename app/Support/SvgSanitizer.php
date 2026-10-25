<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

class SvgSanitizer
{
    private const DANGEROUS_TAGS = [
        'script', 'foreignobject', 'embed', 'object', 'applet', 'iframe',
        'link', 'meta', 'frame', 'frameset', 'xml',
    ];

    /**
     * Sanitize and analyze an SVG file string.
     *
     * @return array{
     *     valid: bool,
     *     error?: string,
     *     svg?: string,
     *     view_box?: array{min_x: float, min_y: float, width: float, height: float},
     *     width?: float,
     *     height?: float,
     *     aspect_ratio?: float
     * }
     */
    public static function process(string $svgContent): array
    {
        $trimmed = trim($svgContent);
        if ($trimmed === '' || ! str_contains($trimmed, '<svg')) {
            return ['valid' => false, 'error' => 'File does not contain valid SVG markup.'];
        }

        // Prevent XXE and external entity resolution
        $previousEntityLoader = false;
        if (\PHP_VERSION_ID < 80000) {
            // @phpstan-ignore-next-line
            $previousEntityLoader = libxml_disable_entity_loader(true);
        }

        $dom = new DOMDocument;
        $dom->preserveWhiteSpace = false;
        $dom->formatOutput = true;

        $flags = LIBXML_NONET | LIBXML_NOWARNING | LIBXML_NOERROR;
        if (defined('LIBXML_NOENT')) {
            // Do not substitute entities
            $flags |= LIBXML_NOENT;
        }

        $loaded = @$dom->loadXML($trimmed, $flags);

        if (\PHP_VERSION_ID < 80000) {
            // @phpstan-ignore-next-line
            libxml_disable_entity_loader($previousEntityLoader);
        }

        if (! $loaded) {
            return ['valid' => false, 'error' => 'Unable to parse SVG XML. Please check the file formatting.'];
        }

        $root = $dom->documentElement;
        if (! $root || strtolower($root->tagName) !== 'svg') {
            return ['valid' => false, 'error' => 'Root element must be <svg>.'];
        }

        // Clean dangerous elements and attributes
        self::sanitizeNode($root);

        // Extract viewBox and dimensions
        $vbStr = $root->getAttribute('viewBox');
        $minX = 0.0;
        $minY = 0.0;
        $vbW = 100.0;
        $vbH = 100.0;

        if ($vbStr !== '') {
            $parts = preg_split('/[\s,]+/', trim($vbStr));
            if (is_array($parts) && count($parts) >= 4) {
                $minX = (float) $parts[0];
                $minY = (float) $parts[1];
                $vbW = max(0.1, (float) $parts[2]);
                $vbH = max(0.1, (float) $parts[3]);
            }
        } else {
            $attrW = (float) preg_replace('/[^\d.]/', '', $root->getAttribute('width'));
            $attrH = (float) preg_replace('/[^\d.]/', '', $root->getAttribute('height'));
            if ($attrW > 0 && $attrH > 0) {
                $vbW = $attrW;
                $vbH = $attrH;
            }
            $root->setAttribute('viewBox', "0 0 {$vbW} {$vbH}");
        }

        $cleanSvg = $dom->saveXML($root);
        if ($cleanSvg === false) {
            return ['valid' => false, 'error' => 'Failed to serialize sanitized SVG.'];
        }

        $aspectRatio = round($vbH / $vbW, 4);

        return [
            'valid' => true,
            'svg' => $cleanSvg,
            'view_box' => ['min_x' => $minX, 'min_y' => $minY, 'width' => $vbW, 'height' => $vbH],
            'width' => $vbW,
            'height' => $vbH,
            'aspect_ratio' => $aspectRatio,
        ];
    }

    private static function sanitizeNode(DOMNode $node): void
    {
        $removeChildren = [];

        foreach ($node->childNodes as $child) {
            if ($child instanceof DOMElement) {
                $tag = strtolower($child->localName ?: $child->tagName);

                // Strip dangerous tags completely
                if (in_array($tag, self::DANGEROUS_TAGS, true)) {
                    $removeChildren[] = $child;

                    continue;
                }

                // Clean attributes
                self::cleanAttributes($child);

                // Recurse into valid child elements
                self::sanitizeNode($child);
            }
        }

        foreach ($removeChildren as $rem) {
            $node->removeChild($rem);
        }
    }

    private static function cleanAttributes(DOMElement $element): void
    {
        $removeAttrs = [];

        if ($element->hasAttributes()) {
            foreach ($element->attributes as $attr) {
                $name = strtolower($attr->name);
                $val = trim($attr->value);

                // Strip inline event listeners (onclick, onload, etc.)
                if (str_starts_with($name, 'on')) {
                    $removeAttrs[] = $attr->name;

                    continue;
                }

                // Strip javascript: or data: URIs in href / xlink:href / src
                if (in_array($name, ['href', 'xlink:href', 'src'], true)) {
                    $lowerVal = strtolower($val);
                    if (str_starts_with($lowerVal, 'javascript:') || str_starts_with($lowerVal, 'vbscript:')) {
                        $removeAttrs[] = $attr->name;

                        continue;
                    }
                }
            }
        }

        foreach ($removeAttrs as $attrName) {
            $element->removeAttribute($attrName);
        }
    }
}
