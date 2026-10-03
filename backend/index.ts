import {
  router,
  json,
  error,
  requireAuth,
  requireAdminEmailAllowlist,
} from '@appdeploy/sdk';
import { db, storage } from '@appdeploy/sdk';

const ADMIN_EMAILS = ['trendtribeluxurywears@gmail.com'];
const TABLE = 'trend_tribe_products';

type ProductRecord = {
  name: string;
  price: number;
  category: string;
  description: string;
  sizes: string;
  imagePath: string;
  available: boolean;
  createdAt: string;
};

const toProduct = async (id: string, record: ProductRecord) => {
  const [urlRecord] = await storage.url([record.imagePath]);
  return { id, ...record, imageUrl: urlRecord?.url ?? '' };
};

export const handler = router({
  'GET /api/products': [
    async () => {
      const { items } = await db.list<ProductRecord>(TABLE, { limit: 100 });
      const products = await Promise.all(
        items.map(item => toProduct(item.id, item))
      );
      products.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return json({ products });
    },
  ],
  'POST /api/products': [
    requireAuth(),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async ({ body }) => {
      const input = body as {
        name?: string;
        price?: string;
        category?: string;
        description?: string;
        sizes?: string;
        imageData?: string;
        imageType?: string;
        available?: boolean;
      };
      if (
        !input.name?.trim() ||
        !input.price ||
        !input.imageData ||
        !input.imageType
      )
        return error('Name, price and image are required', 400);
      const safeName = input.name
        .trim()
        .replace(/[^a-zA-Z0-9-_]+/g, '-')
        .toLowerCase()
        .slice(0, 80);
      const path = `products/${Date.now()}-${safeName}`;
      const [stored] = await storage.write([
        { path, content: input.imageData, contentType: input.imageType },
      ]);
      if (!stored) return error('Could not store product image', 500);
      const [id] = await db.add(TABLE, [
        {
          name: input.name.trim(),
          price: Number(input.price),
          category: input.category || 'Unisex',
          description:
            input.description?.trim() || 'A curated Trend Tribe piece.',
          sizes: input.sizes?.trim() || '',
          imagePath: path,
          available: input.available !== false,
          createdAt: new Date().toISOString(),
        },
      ]);
      if (!id) {
        await storage.delete([path]);
        return error('Could not create product', 500);
      }
      return json({ id }, 201);
    },
  ],
  'DELETE /api/products/:id': [
    requireAuth(),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async ({ params }) => {
      const [product] = await db.get<ProductRecord>(TABLE, [params.id]);
      if (!product) return error('Product not found', 404);
      const [deleted] = await db.delete(TABLE, [params.id]);
      if (!deleted) return error('Could not delete product', 500);
      await storage.delete([product.imagePath]);
      return json({ deleted: true });
    },
  ],
});
