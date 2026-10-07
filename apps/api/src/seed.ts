import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Agent, AgentDocument } from './agents/schemas/agent.schema';
import { AppModule } from './app.module';
import { Inquiry, InquiryDocument } from './inquiries/schemas/inquiry.schema';
import {
  ListingType,
  Property,
  PropertyDocument,
  PropertyStatus,
  PropertyType,
} from './properties/schemas/property.schema';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const agents = app.get<Model<AgentDocument>>(getModelToken(Agent.name));
    const properties = app.get<Model<PropertyDocument>>(
      getModelToken(Property.name),
    );
    const inquiries = app.get<Model<InquiryDocument>>(
      getModelToken(Inquiry.name),
    );

    const agentId = new Types.ObjectId('64b000000000000000000001');
    const agent = await agents.findOneAndUpdate(
      { _id: agentId },
      {
        $set: {
          firstName: 'Amina',
          lastName: 'Bello',
          email: 'amina.bello@example.com',
          phone: '+2348000000000',
          agency: 'Haven Realty',
          active: true,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      },
    );

    const listings = [
      {
        id: '64b000000000000000000011',
        title: 'A home among the trees',
        description:
          'A welcoming family home with a generous garden and plenty of natural light.',
        type: PropertyType.House,
        listingType: ListingType.Sale,
        price: 185000,
        address: '12 Garden Avenue',
        city: 'Lagos',
        country: 'Nigeria',
        bedrooms: 4,
        bathrooms: 3,
        area: 240,
        areaUnit: 'sqm',
      },
      {
        id: '64b000000000000000000012',
        title: 'A little room to grow',
        description:
          'A peaceful residential plot with convenient access to local roads and utilities.',
        type: PropertyType.Land,
        listingType: ListingType.Sale,
        price: 68000,
        address: '8 Orchard Close',
        city: 'Abuja',
        country: 'Nigeria',
        area: 500,
        areaUnit: 'sqm',
      },
      {
        id: '64b000000000000000000013',
        title: 'The sunlit city apartment',
        description:
          'A bright, comfortable apartment close to cafes, shops, and public transport.',
        type: PropertyType.Apartment,
        listingType: ListingType.Rent,
        price: 950,
        address: '24 Palm Street',
        city: 'Lagos',
        country: 'Nigeria',
        bedrooms: 2,
        bathrooms: 2,
        area: 105,
        areaUnit: 'sqm',
      },
    ];

    for (const listing of listings) {
      await properties.findOneAndUpdate(
        { _id: new Types.ObjectId(listing.id) },
        {
          $set: {
            title: listing.title,
            description: listing.description,
            type: listing.type,
            listingType: listing.listingType,
            price: listing.price,
            currency: 'USD',
            address: listing.address,
            city: listing.city,
            country: listing.country,
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            area: listing.area,
            areaUnit: listing.areaUnit,
            status: PropertyStatus.Available,
            agent: agent._id,
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
          setDefaultsOnInsert: true,
        },
      );
    }

    const sampleInquiries = [
      {
        id: '64b000000000000000000021',
        property: listings[0],
        name: 'Sam Example',
        email: 'sam@example.com',
        phone: '+2348000000001',
        message: 'Could I arrange a viewing this weekend?',
      },
      {
        id: '64b000000000000000000022',
        property: listings[1],
        name: 'Tomi Example',
        email: 'tomi@example.com',
        phone: '+2348000000002',
        message: 'Is the plot title and survey available to review?',
      },
      {
        id: '64b000000000000000000023',
        property: listings[2],
        name: 'Alex Example',
        email: 'alex@example.com',
        phone: '+2348000000003',
        message: 'Is the apartment available for a longer-term lease?',
      },
    ];

    for (const inquiry of sampleInquiries) {
      await inquiries.findOneAndUpdate(
        { _id: new Types.ObjectId(inquiry.id) },
        {
          $set: {
            property: new Types.ObjectId(inquiry.property.id),
            agent: agent._id,
            name: inquiry.name,
            email: inquiry.email,
            phone: inquiry.phone,
            message: inquiry.message,
            status: 'new',
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
          setDefaultsOnInsert: true,
        },
      );
    }

    console.log(
      'Demo data is ready: 1 agent, 3 properties, and 3 inquiries.',
    );
  } finally {
    await app.close();
  }
}

void seed().catch((error: unknown) => {
  console.error('Failed to seed demo data:', error);
  process.exitCode = 1;
});
