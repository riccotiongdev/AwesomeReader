import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { OPMLFeed, OPMLFolder, OPMLStructure } from '@/types';

export function parseOPML(opmlXml: string): OPMLStructure {
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const parsed = xmlParser.parse(opmlXml);
  const body = parsed?.opml?.body;

  if (!body) {
    throw new Error('Invalid OPML structure: missing <body> tag');
  }

  const title = parsed?.opml?.head?.title || 'AwesomeReader Subscriptions';
  const folders: OPMLFolder[] = [];
  const rootFeeds: OPMLFeed[] = [];

  const rawOutlines = Array.isArray(body.outline) ? body.outline : body.outline ? [body.outline] : [];

  for (const item of rawOutlines) {
    const text = item['@_text'] || item['@_title'] || 'Folder';
    const xmlUrl = item['@_xmlUrl'];

    if (xmlUrl) {
      rootFeeds.push({
        title: text,
        xmlUrl,
        htmlUrl: item['@_htmlUrl'],
      });
    } else if (item.outline) {
      // It's a folder containing child feed outlines
      const childOutlines = Array.isArray(item.outline) ? item.outline : [item.outline];
      const folderFeeds: OPMLFeed[] = [];

      for (const child of childOutlines) {
        const childXmlUrl = child['@_xmlUrl'];
        if (childXmlUrl) {
          folderFeeds.push({
            title: child['@_text'] || child['@_title'] || 'Feed',
            xmlUrl: childXmlUrl,
            htmlUrl: child['@_htmlUrl'],
          });
        }
      }

      folders.push({
        name: text,
        feeds: folderFeeds,
      });
    }
  }

  return {
    title,
    folders,
    rootFeeds,
  };
}

export function generateOPML(structure: OPMLStructure): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
  });

  const bodyOutlines: any[] = [];

  // Root feeds
  for (const feed of structure.rootFeeds) {
    bodyOutlines.push({
      '@_text': feed.title,
      '@_title': feed.title,
      '@_type': 'rss',
      '@_xmlUrl': feed.xmlUrl,
      '@_htmlUrl': feed.htmlUrl || '',
    });
  }

  // Folders
  for (const folder of structure.folders) {
    const childOutlines = folder.feeds.map((feed) => ({
      '@_text': feed.title,
      '@_title': feed.title,
      '@_type': 'rss',
      '@_xmlUrl': feed.xmlUrl,
      '@_htmlUrl': feed.htmlUrl || '',
    }));

    bodyOutlines.push({
      '@_text': folder.name,
      '@_title': folder.name,
      outline: childOutlines,
    });
  }

  const opmlObj = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8',
    },
    opml: {
      '@_version': '2.0',
      head: {
        title: structure.title || 'AwesomeReader Export',
        dateCreated: new Date().toUTCString(),
      },
      body: {
        outline: bodyOutlines,
      },
    },
  };

  return builder.build(opmlObj);
}
