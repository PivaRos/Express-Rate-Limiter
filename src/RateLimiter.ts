import { Request, Response, NextFunction } from "express";
import moment from "moment";
import requestIP from "request-ip";

export enum IdentifierEnum {
  ByIP = "Ip",
  ByAuthorization = "Authorization",
}

export interface RateLimiterOptions {
  IdentifierType?: IdentifierEnum;
}

const RateLimiter = (
  RequestsPerMinute: number,
  { IdentifierType }: RateLimiterOptions
) => {
  let IpMap = new Map<string, number>();
  let BackOffMap = new Map<string, Date>();
  return (req: Request, res: Response, next: NextFunction) => {
    let Identifier;
    switch (IdentifierType) {
      case IdentifierEnum.ByIP:
        Identifier = requestIP.getClientIp(req);
        break;
      case IdentifierEnum.ByAuthorization:
        Identifier = req.headers.authorization;
        break;
      default:
        Identifier = requestIP.getClientIp(req);
        break;
    }

    if (!Identifier) return [res.status(429), res.send("no identifier found")];
    //first check if not backoffed
    if (BackOffMap.has(Identifier)) {
      const backoffUntilDate = BackOffMap.get(Identifier);
      if (backoffUntilDate) {
        if (backoffUntilDate.getTime() < Date.now()) {
          //release back off
          BackOffMap.delete(Identifier);
          IpMap.delete(Identifier);
        } else {
          //send back off massage again
          const retry = Math.round(
            (backoffUntilDate.getTime() - Date.now()) / 1000
          );
          res.setHeader("Retry-after", retry);
          return res.sendStatus(429);
        }
      }
    }
    if (IpMap.has(Identifier)) {
      const prevIndex = IpMap.get(Identifier);
      if (prevIndex === RequestsPerMinute) {
        //back off set

        // back off for one minute;
        var BackOffDate = moment(Date.now()).add(60, "seconds").toDate();
        BackOffMap.set(Identifier, BackOffDate);
        var whenRetry = 60; // some value
        res.setHeader("Retry-After", whenRetry);
        return [res.sendStatus(429)];
      }
      if (prevIndex) {
        IpMap.set(Identifier, prevIndex + 1);
      }
    } else {
      IpMap.set(Identifier, 1);
    }

    next();
  };
};

export default RateLimiter;
